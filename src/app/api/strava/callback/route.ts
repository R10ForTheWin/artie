import { NextRequest, NextResponse } from 'next/server';
import { pool, initSchema } from '@/lib/db';
import { TEAMMATES } from '@/lib/teammates';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const name = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');
  const baseUrl = 'https://artie-production-1b13.up.railway.app';

  if (error || !code || !name || !TEAMMATES.includes(name as typeof TEAMMATES[number])) {
    return NextResponse.redirect(`${baseUrl}/strava?error=auth_failed`);
  }

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

  if (!res.ok) return NextResponse.redirect(`${baseUrl}/strava?error=token_failed`);
  const data = await res.json();

  await initSchema();
  await pool.query(
    `INSERT INTO strava_tokens (name, athlete_id, access_token, refresh_token, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (name) DO UPDATE SET athlete_id=$2, access_token=$3, refresh_token=$4, expires_at=$5`,
    [name, data.athlete.id, data.access_token, data.refresh_token, data.expires_at]
  );

  return NextResponse.redirect(`${baseUrl}/strava?connected=${encodeURIComponent(name)}`);
}
