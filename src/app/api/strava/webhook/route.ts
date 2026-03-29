import { NextRequest, NextResponse } from 'next/server';
import { initSchema } from '@/lib/db';
import { importStravaActivity } from '@/lib/strava';

// Strava calls GET to verify the webhook subscription
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.STRAVA_VERIFY_TOKEN) {
    return NextResponse.json({ 'hub.challenge': challenge });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// Strava calls POST when a new activity is created
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.object_type === 'activity' && body.aspect_type === 'create') {
    // Respond immediately — Strava requires < 2s response
    setImmediate(async () => {
      try {
        await initSchema();
        await importStravaActivity(body.owner_id, body.object_id);
      } catch (err) {
        console.error('Strava import error:', err);
      }
    });
  }

  return NextResponse.json({ ok: true });
}
