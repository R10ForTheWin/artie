import { NextRequest, NextResponse } from 'next/server';
import { initSchema } from '@/lib/db';
import { getPerson } from '@/lib/people';
import { sessionName, signSession } from '@/lib/auth';

const BASE_URL = 'https://artie-r10.up.railway.app';

// Connects the signed-in person's Strava, never anyone else's: the name comes
// from the session, not the link, so tapping Connect can't attach your Strava
// to a teammate.
export async function GET(req: NextRequest) {
  await initSchema();
  const secret = process.env.AUTH_SECRET;
  const name = await sessionName(req);
  if (!secret || !name || !(await getPerson(name))) {
    return NextResponse.redirect(`${BASE_URL}/login?next=/strava`);
  }

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${BASE_URL}/api/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    // Signed, so the callback knows who this is even if Strava hands back to a
    // browser without the ARTIE cookie (e.g. ARTIE saved to the home screen).
    state: await signSession(`strava:${name}`, secret),
  });

  // On a phone, Strava's mobile authorize opens the Strava app, where they are
  // already signed in, so there is no Strava password to type.
  const mobile = /iPhone|iPad|iPod|Android/i.test(req.headers.get('user-agent') ?? '');
  const path = mobile ? 'oauth/mobile/authorize' : 'oauth/authorize';
  return NextResponse.redirect(`https://www.strava.com/${path}?${params}`);
}
