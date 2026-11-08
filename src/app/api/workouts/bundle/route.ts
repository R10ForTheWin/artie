import { NextRequest, NextResponse } from 'next/server';
import { pool, initSchema } from '@/lib/db';
import { sessionName } from '@/lib/auth';
import { isKnownPaddler } from '@/lib/people';
import { isActivity } from '@/lib/activity';
import { SCREEN_KINDS, type ScreenRead } from '@/lib/parsers/garminScreen';
import {
  mergeReads, applyPolicy, activityFor, findExisting, insertWorkout, fillWorkout, saveScreens, todayPacific,
  type LinkRead,
} from '@/lib/workoutBundle';

export const dynamic = 'force-dynamic';

/**
 * A Garmin link plus any number of app screenshots, saved as one workout. The
 * page has already read each piece (/api/workouts/read), so the readings come
 * back with the images and aren't paid for twice. If the same session is
 * already logged, the new pieces fill in what it was missing instead.
 */
export async function POST(req: NextRequest) {
  try {
    await initSchema();
    const form = await req.formData();
    let name = String(form.get('name') ?? '');
    const signedIn = await sessionName(req);
    if (signedIn) name = signedIn;
    if (!name || !(await isKnownPaddler(name))) return NextResponse.json({ error: 'Not a known paddler' }, { status: 400 });

    const link = JSON.parse(String(form.get('link') ?? 'null')) as LinkRead | null;
    const reads = JSON.parse(String(form.get('reads') ?? '[]')) as ScreenRead[];
    const files = form.getAll('screen').filter((f): f is File => f instanceof File);
    if (!link && reads.length === 0) return NextResponse.json({ error: 'Nothing to add.' }, { status: 400 });

    const screens = reads
      .map((r, i) => ({ read: r, file: files[i] }))
      .filter((s) => s.file && (SCREEN_KINDS as readonly string[]).includes(s.read.kind));

    // "Add map or splits" from the confirmation: attach to that exact workout.
    const addToRaw = Number(form.get('addTo'));
    let addTo: { id: number; date: string; activity: string } | null = null;
    if (Number.isInteger(addToRaw) && addToRaw > 0) {
      const { rows } = await pool.query('SELECT id, LEFT(workout_date, 10) AS date, activity FROM workouts WHERE id = $1 AND name = $2', [addToRaw, name]);
      if (!rows[0]) return NextResponse.json({ error: 'That workout is not yours to add to.' }, { status: 403 });
      addTo = rows[0];
    }

    const merged0 = mergeReads(link, screens.map((s) => s.read));
    const explicit = form.get('activity');
    const activity = addTo && isActivity(addTo.activity) ? addTo.activity : isActivity(explicit) ? explicit : activityFor(merged0);
    const merged = await applyPolicy(name, activity, merged0);

    if (!addTo && !merged.distance_m && !merged.duration_s) {
      return NextResponse.json(
        { error: 'No distance or time in these. Add the Garmin link or an Overview screenshot.' },
        { status: 422 }
      );
    }

    const date = addTo?.date ?? merged.workout_date ?? todayPacific();
    const fileName = link ? `garmin-${link.activityId}` : `garmin-screens-${date}-${Date.now()}`;
    const existing = addTo?.id ?? (await findExisting(name, link ? fileName : null, date, merged.distance_m));

    let id: number;
    if (existing) {
      id = existing;
      await fillWorkout(id, merged);
    } else {
      id = await insertWorkout(name, fileName, activity, { ...merged, workout_date: date });
    }
    await saveScreens(id, await Promise.all(screens.map(async (s) => ({ kind: s.read.kind, buffer: Buffer.from(await s.file.arrayBuffer()) }))));

    // Read the row back so the confirmation shows what's actually stored,
    // including anything an existing workout already had.
    const { rows: [saved] } = await pool.query(
      `SELECT activity, workout_date, distance_m, duration_s, avg_speed_ms, calories,
              avg_hr, location,
              (map_svg IS NOT NULL OR map_image_url IS NOT NULL
               OR EXISTS (SELECT 1 FROM workout_screens s WHERE s.workout_id = workouts.id AND s.kind = 'overview')) AS has_map,
              CASE WHEN jsonb_typeof(mile_splits) = 'array' THEN jsonb_array_length(mile_splits) ELSE 0 END AS splits
         FROM workouts WHERE id = $1`,
      [id]
    );
    return NextResponse.json({
      id, updated: Boolean(existing), name, screens: screens.length,
      ...saved, workout_date: String(saved.workout_date).slice(0, 10),
    }, { status: existing ? 200 : 201 });
  } catch (err) {
    console.error('Bundle error:', err);
    return NextResponse.json({ error: 'Could not save that workout.' }, { status: 500 });
  }
}
