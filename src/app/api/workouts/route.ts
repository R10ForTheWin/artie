import { NextRequest, NextResponse } from 'next/server';
import { pool, initSchema } from '@/lib/db';
import { parseWorkoutFile } from '@/lib/parsers';
import { injectMapLocation } from '@/lib/parsers/gpxParser';
import { parseLapsImage } from '@/lib/parsers/imageParser';
import { TEAMMATES } from '@/lib/teammates';

export async function GET() {
  await initSchema();
  const result = await pool.query('SELECT * FROM workouts ORDER BY workout_date DESC');
  return NextResponse.json(result.rows);
}

function extractGarminActivityId(url: string): string | null {
  const match = url.match(/connect\.garmin\.com\/(?:modern|app)\/activity\/(\d+)/);
  return match ? match[1] : null;
}

function parseDurationToSeconds(str: string): number | null {
  const parts = str.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

async function fetchGarminActivityFromPage(activityId: string, workoutDate: string): Promise<import('@/lib/parsers').ParsedWorkout & { map_image_url: string | null }> {
  const pageUrl = `https://connect.garmin.com/modern/activity/${activityId}`;
  const res = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html',
    },
    redirect: 'follow',
  });

  if (!res.ok) throw new Error('Could not load Garmin activity page');

  const html = await res.text();

  const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
  const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
  const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);

  if (!descMatch) throw new Error('Could not find workout data on Garmin activity page');

  const desc = descMatch[1];
  // Format: "Distance 4.79 mi | Time 1:03:08 | Speed 4.6 mph"
  const distanceMatch = desc.match(/Distance ([\d.]+) mi/);
  const timeMatch = desc.match(/Time ([\d:]+)/);
  const speedMatch = desc.match(/Speed ([\d.]+) mph/);

  const distance_m = distanceMatch ? parseFloat(distanceMatch[1]) * 1609.344 : null;
  const duration_s = timeMatch ? parseDurationToSeconds(timeMatch[1]) : null;
  const avg_speed_ms = speedMatch ? parseFloat(speedMatch[1]) * 0.44704 : null;

  if (!distance_m && !duration_s) {
    throw new Error('Could not parse workout data from Garmin activity page');
  }

  return {
    workout_date: workoutDate,
    duration_s,
    distance_m,
    avg_speed_ms,
    max_speed_ms: null,
    avg_hr: null,
    max_hr: null,
    calories: null,
    map_image_url: imageMatch ? imageMatch[1] : null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const location = (formData.get('location') as string) || null;
    const file = formData.get('file') as File | null;
    const lapsFiles = formData.getAll('lapsFile') as File[];
    const garminUrl = (formData.get('garminUrl') as string) || null;
    const workoutDate = (formData.get('workoutDate') as string) || new Date().toISOString();

    if (!name || !TEAMMATES.includes(name as typeof TEAMMATES[number])) {
      return NextResponse.json({ error: 'Invalid teammate name' }, { status: 400 });
    }

    let buffer: Buffer;
    let fileName: string;
    let ext: 'fit' | 'gpx' | 'image';
    let mimeType: string | undefined;

    if (garminUrl) {
      const activityId = extractGarminActivityId(garminUrl);
      if (!activityId) {
        return NextResponse.json({ error: 'Invalid Garmin Connect URL' }, { status: 400 });
      }

      try {
        const parsed = await fetchGarminActivityFromPage(activityId, workoutDate);

        let mile_splits: number[] | null = null;
        if (lapsFiles.length > 0) {
          const allSplits: number[] = [];
          for (const lapsFile of lapsFiles) {
            const lapsBuffer = Buffer.from(await lapsFile.arrayBuffer());
            const splits = await parseLapsImage(lapsBuffer, lapsFile.type);
            allSplits.push(...splits);
          }
          if (allSplits.length > 0) mile_splits = allSplits;
        }

        await initSchema();
        const result = await pool.query(
          `INSERT INTO workouts (name, file_name, file_type, workout_date, duration_s, distance_m, avg_speed_ms, max_speed_ms, avg_hr, max_hr, calories, location, mile_splits, map_image_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           RETURNING *`,
          [
            name,
            `garmin-${activityId}`,
            'fit',
            parsed.workout_date,
            parsed.duration_s,
            parsed.distance_m,
            parsed.avg_speed_ms,
            null,
            null,
            null,
            null,
            location,
            mile_splits ? JSON.stringify(mile_splits) : null,
            parsed.map_image_url ?? null,
          ]
        );
        return NextResponse.json(result.rows[0], { status: 201 });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch Garmin activity';
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    } else if (file) {
      const lowerName = file.name.toLowerCase();
      const imageExts = ['.heic', '.jpg', '.jpeg', '.png', '.webp'];
      const detectedExt = lowerName.endsWith('.fit')
        ? 'fit'
        : lowerName.endsWith('.gpx')
        ? 'gpx'
        : imageExts.some((e) => lowerName.endsWith(e))
        ? 'image'
        : null;

      if (!detectedExt) {
        return NextResponse.json(
          { error: 'Only .fit, .gpx, or workout screenshot files are supported' },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      fileName = file.name;
      ext = detectedExt as 'fit' | 'gpx' | 'image';
      mimeType = file.type;
    } else {
      return NextResponse.json({ error: 'No file or Garmin URL provided' }, { status: 400 });
    }

    const parsed = await parseWorkoutFile(buffer, ext, mimeType);

    // Mile splits: from parsed file (GPX) or laps screenshots (concatenated)
    let mile_splits: number[] | null = parsed.mile_splits ?? null;
    if (!mile_splits && lapsFiles.length > 0) {
      const allSplits: number[] = [];
      for (const lapsFile of lapsFiles) {
        const lapsBuffer = Buffer.from(await lapsFile.arrayBuffer());
        const splits = await parseLapsImage(lapsBuffer, lapsFile.type);
        allSplits.push(...splits);
      }
      if (allSplits.length > 0) mile_splits = allSplits;
    }

    await initSchema();
    const result = await pool.query(
      `INSERT INTO workouts (name, file_name, file_type, workout_date, duration_s, distance_m, avg_speed_ms, max_speed_ms, avg_hr, max_hr, calories, location, mile_splits, avg_temp_c, map_svg)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        name,
        fileName,
        ext,
        parsed.workout_date,
        parsed.duration_s,
        parsed.distance_m,
        parsed.avg_speed_ms,
        parsed.max_speed_ms,
        parsed.avg_hr,
        parsed.max_hr,
        parsed.calories,
        location,
        mile_splits ? JSON.stringify(mile_splits) : null,
        parsed.avg_temp_c ?? null,
        parsed.map_svg && location ? injectMapLocation(parsed.map_svg, location) : (parsed.map_svg ?? null),
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Failed to parse workout file' }, { status: 500 });
  }
}
