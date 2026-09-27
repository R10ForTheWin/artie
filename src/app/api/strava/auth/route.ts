import { NextRequest, NextResponse } from 'next/server';
import { initSchema } from '@/lib/db';
import { getPerson } from '@/lib/people';

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name');
  await initSchema();
  if (!name || !(await getPerson(name))) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  }

  const baseUrl = 'https://artie-r10.up.railway.app';
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${baseUrl}/api/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    state: name,
  });

  return NextResponse.redirect(`https://www.strava.com/oauth/authorize?${params}`);
}
