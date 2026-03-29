import { NextRequest, NextResponse } from 'next/server';
import { TEAMMATES } from '@/lib/teammates';

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name');
  if (!name || !TEAMMATES.includes(name as typeof TEAMMATES[number])) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.nextUrl.host}`;
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
