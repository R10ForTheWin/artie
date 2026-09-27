import { NextRequest, NextResponse } from 'next/server';
import { readGarminScreen } from '@/lib/parsers/garminScreen';
import { extractGarminActivityId, fetchGarminActivityFromPage } from '@/lib/garminLink';
import { describeRead, type LinkRead } from '@/lib/workoutBundle';

export const dynamic = 'force-dynamic';

/**
 * Reads one piece — a screenshot or a Garmin link — so the upload page can show
 * what it found before anything is saved. Nothing is written here.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const url = form.get('garminUrl');
    if (typeof url === 'string' && url) {
      const activityId = extractGarminActivityId(url);
      if (!activityId) return NextResponse.json({ error: 'That is not a Garmin activity link.' }, { status: 400 });
      const p = await fetchGarminActivityFromPage(activityId, '');
      const link: LinkRead = {
        activityId, distance_m: p.distance_m, duration_s: p.duration_s, avg_speed_ms: p.avg_speed_ms,
        map_image_url: p.map_image_url, title: p.title,
      };
      const mi = p.distance_m ? `${(p.distance_m / 1609.344).toFixed(2)} mi` : null;
      const speed = p.avg_speed_ms ? `${(p.avg_speed_ms / 0.44704).toFixed(1)} mph` : null;
      return NextResponse.json({ kind: 'link', link, summary: [mi, speed].filter(Boolean).join(' · ') || 'read' });
    }

    const image = form.get('image');
    if (!(image instanceof File)) return NextResponse.json({ error: 'Nothing to read.' }, { status: 400 });
    const read = await readGarminScreen(Buffer.from(await image.arrayBuffer()));
    return NextResponse.json({ ...read, summary: describeRead(read) });
  } catch (err) {
    console.error('Read error:', err);
    return NextResponse.json({ error: 'Could not read that one.' }, { status: 422 });
  }
}
