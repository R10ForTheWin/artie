import { NextRequest, NextResponse } from 'next/server';
import { pool, initSchema } from '@/lib/db';
import { backfillSplitsFromStrava, importRecentFromStrava } from '@/lib/strava';
import { getPerson } from '@/lib/people';
import { SEASONS } from '@/lib/seasons';
import { sessionName, verifySession } from '@/lib/auth';

const BASE_URL = 'https://artie-r10.up.railway.app';

/**
 * Where to send them afterwards. With the ARTIE cookie, back to the Strava page;
 * without it (Strava opened a different browser), a plain page that needs no
 * sign-in, so they aren't bounced to a login screen mid-connect.
 */
async function finish(req: NextRequest, result: 'connected' | 'denied' | 'scope' | 'taken' | 'failed') {
  if (await sessionName(req)) return NextResponse.redirect(`${BASE_URL}/strava?result=${result}`);
  const text: Record<typeof result, string> = {
    connected: 'Strava is connected. Your paddles and swims will show up in ARTIE on their own.',
    denied: 'Strava was not connected. Open ARTIE and tap Connect again when you are ready.',
    scope: 'ARTIE needs permission to see your activities. Tap Connect again and leave the activities box checked.',
    taken: 'That Strava account is already connected to a different teammate in ARTIE.',
    failed: 'Something went wrong connecting Strava. Open ARTIE and tap Connect again.',
  };
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ARTIE</title></head>` +
      `<body style="font-family:-apple-system,sans-serif;max-width:420px;margin:60px auto;padding:24px;text-align:center;color:#1B2A4A">` +
      `<h1 style="font-size:22px">${result === 'connected' ? 'All set' : 'Not connected'}</h1><p style="line-height:1.5">${text[result]}</p>` +
      `<a href="${BASE_URL}/strava" style="display:inline-block;margin-top:16px;padding:14px 28px;background:#1B2A4A;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">Open ARTIE</a>` +
      `</body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  await initSchema();

  const secret = process.env.AUTH_SECRET;
  const signed = secret ? await verifySession(q.get('state') ?? undefined, secret) : null;
  const name = signed?.startsWith('strava:') ? signed.slice('strava:'.length) : null;
  if (!name || !(await getPerson(name))) return finish(req, 'failed');

  if (q.get('error')) return finish(req, 'denied');
  const code = q.get('code');
  if (!code) return finish(req, 'failed');
  // Strava lets them untick the activities box; without it there is nothing to import
  if (!/activity:read/.test(q.get('scope') ?? '')) return finish(req, 'scope');

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) return finish(req, 'failed');
  const data = await res.json();

  // One Strava account, one teammate: otherwise imports would land under the wrong name
  const other = await pool.query('SELECT name FROM strava_tokens WHERE athlete_id::text = $1 AND name != $2', [
    String(data.athlete.id),
    name,
  ]);
  if (other.rows.length > 0) return finish(req, 'taken');

  await pool.query(
    `INSERT INTO strava_tokens (name, athlete_id, access_token, refresh_token, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (name) DO UPDATE SET athlete_id=$2, access_token=$3, refresh_token=$4, expires_at=$5`,
    [name, data.athlete.id, data.access_token, data.refresh_token, data.expires_at]
  );

  // Linking Strava puts you on the chart: anything of yours held off it shows now
  await pool.query('UPDATE workouts SET hide_from_chart = false WHERE name = $1 AND hide_from_chart = true', [name]);

  // Pull everything since this season began (Zach, the first to link, gets two
  // weeks), then fill splits on older uploads. Duplicates are skipped.
  const since = name === 'Zach'
    ? new Date(Date.now() - 14 * 86400_000).toISOString().slice(0, 10)
    : SEASONS[0].start;
  void importRecentFromStrava(name, since)
    .catch((err) => console.error('[strava] recent import error:', err))
    .then(() => backfillSplitsFromStrava(name))
    .catch((err) => console.error('[strava] backfill error:', err));

  return finish(req, 'connected');
}
