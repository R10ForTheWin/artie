import { NextRequest, NextResponse } from 'next/server';
import { pool, initSchema, isCrossSourceDuplicate } from '@/lib/db';
import { parseWorkoutFile } from '@/lib/parsers';
import { injectMapLocation } from '@/lib/parsers/gpxParser';
import { parseLapsImage } from '@/lib/parsers/imageParser';
import { isKnownPaddler, usesHrMonitor } from '@/lib/people';
import { extractGarminActivityId, fetchGarminActivityFromPage } from '@/lib/garminLink';
import { sessionName } from '@/lib/auth';
import { isActivity, classifyActivity, type Activity } from '@/lib/activity';

export async function GET() {
  await initSchema();
  const result = await pool.query('SELECT * FROM workouts ORDER BY workout_date DESC');
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    let name = formData.get('name') as string;
    const location = (formData.get('location') as string) || null;
    const file = formData.get('file') as File | null;
    const lapsFiles = formData.getAll('lapsFile') as File[];
    const garminUrl = (formData.get('garminUrl') as string) || null;
    const workoutDate = (formData.get('workoutDate') as string) || new Date().toISOString();
    const rawActivity = formData.get('activity');
    // 'auto' (or nothing) lets each path infer the sport where it can
    const explicitActivity: Activity | null = isActivity(rawActivity) ? rawActivity : null;
    let activity: Activity = explicitActivity ?? 'paddle';

    // When signed in, that is who this workout belongs to — whatever the form said
    const signedIn = await sessionName(req);
    if (signedIn) name = signedIn;
    if (!name || !(await isKnownPaddler(name))) {
      return NextResponse.json({ error: 'Not a known paddler' }, { status: 400 });
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
        if (!explicitActivity && parsed.title) activity = classifyActivity(parsed.title);

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
        if (await isCrossSourceDuplicate(name, parsed.workout_date.split('T')[0], parsed.distance_m ?? null)) {
          return NextResponse.json({ error: 'A workout for this person on this date with a similar distance already exists.' }, { status: 409 });
        }
        // Replace any auto-created paddleguru workout for this person/date
        await pool.query(
          `DELETE FROM workouts WHERE name = $1 AND workout_date = $2 AND source = 'paddleguru'`,
          [name, parsed.workout_date.split('T')[0]]
        );
        const result = await pool.query(
          `INSERT INTO workouts (name, file_name, file_type, workout_date, duration_s, distance_m, avg_speed_ms, max_speed_ms, avg_hr, max_hr, calories, location, mile_splits, map_image_url, activity)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
            activity,
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
    // A Garmin share card names its sport; trust it over the 'paddle' default
    if (!explicitActivity && parsed.sport) activity = classifyActivity(parsed.sport);

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
    if (await isCrossSourceDuplicate(name, parsed.workout_date.split('T')[0], parsed.distance_m ?? null)) {
      return NextResponse.json({ error: 'A workout for this person on this date with a similar distance already exists.' }, { status: 409 });
    }
    // Replace any auto-created paddleguru workout for this person/date
    await pool.query(
      `DELETE FROM workouts WHERE name = $1 AND workout_date = $2 AND source = 'paddleguru'`,
      [name, parsed.workout_date.split('T')[0]]
    );
    // Wrist heart rate is too far off to keep; only a chest strap's counts
    const keepHr = await usesHrMonitor(name);
    const result = await pool.query(
      `INSERT INTO workouts (name, file_name, file_type, workout_date, duration_s, distance_m, avg_speed_ms, max_speed_ms, avg_hr, max_hr, calories, location, mile_splits, avg_temp_c, map_svg, mile_bearings, activity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
        keepHr ? parsed.avg_hr : null,
        keepHr ? parsed.max_hr : null,
        parsed.calories,
        location,
        mile_splits ? JSON.stringify(mile_splits) : null,
        parsed.avg_temp_c ?? null,
        parsed.map_svg && location ? injectMapLocation(parsed.map_svg, location) : (parsed.map_svg ?? null),
        parsed.mile_bearings ? JSON.stringify(parsed.mile_bearings) : null,
        activity,
      ]
    );

    return NextResponse.json({ ...result.rows[0], activity }, { status: 201 });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Failed to parse workout file' }, { status: 500 });
  }
}
