import { NextRequest, NextResponse } from 'next/server';
import { pool, initSchema } from '@/lib/db';
import { TEAMMATES } from '@/lib/teammates';
import { parseGarminCsv, csvFileName, type SwimUnit } from '@/lib/parsers/garminCsv';

export const dynamic = 'force-dynamic';

/**
 * Bulk import of a Garmin Connect activity CSV export.
 *
 * `commit=false` (the default) reports what would be imported without writing,
 * so the upload page can show a preview — that matters because Garmin exports
 * distance in the account's display units, and a wrong swim unit is much easier
 * to spot before the rows land than after.
 */
export async function POST(req: NextRequest) {
  try {
    await initSchema();
    const form = await req.formData();
    const name = form.get('name') as string;
    const file = form.get('file') as File | null;
    const swimUnit = ((form.get('swimUnit') as string) || 'yards') as SwimUnit;
    const commit = form.get('commit') === 'true';

    if (!name || !TEAMMATES.includes(name as (typeof TEAMMATES)[number])) {
      return NextResponse.json({ error: 'Pick who these workouts belong to.' }, { status: 400 });
    }
    if (!file) return NextResponse.json({ error: 'No CSV file provided.' }, { status: 400 });

    const rows = parseGarminCsv(await file.text(), swimUnit);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No paddle or swim activities found in that CSV.' },
        { status: 422 }
      );
    }

    // One query for every date in the file, rather than a round trip per row
    const dates = [...new Set(rows.map((r) => r.workout_date))];
    const { rows: existing } = await pool.query(
      'SELECT workout_date, file_name FROM workouts WHERE name = $1 AND workout_date = ANY($2)',
      [name, dates]
    );
    const takenDates = new Set(existing.map((e: { workout_date: string }) => e.workout_date));

    // Dates deliberately deleted before — never resurrect these
    const { rows: tombstones } = await pool.query(
      'SELECT workout_date FROM deleted_workouts WHERE name = $1 AND workout_date = ANY($2)',
      [name, dates]
    );
    for (const t of tombstones) takenDates.add(t.workout_date);

    const toImport = rows.filter((r) => !takenDates.has(r.workout_date));
    const skipped = rows.filter((r) => takenDates.has(r.workout_date));

    if (!commit) {
      return NextResponse.json({
        preview: true,
        total: rows.length,
        toImport: toImport.map((r) => ({ ...r, file_name: csvFileName(r) })),
        skipped: skipped.map((r) => ({ workout_date: r.workout_date, title: r.title })),
      });
    }

    const client = await pool.connect();
    const imported: { id: number; workout_date: string }[] = [];
    try {
      await client.query('BEGIN');
      for (const r of toImport) {
        const avgSpeed = r.distance_m && r.duration_s ? r.distance_m / r.duration_s : null;
        const res = await client.query(
          `INSERT INTO workouts
             (name, file_name, file_type, workout_date, duration_s, distance_m,
              avg_speed_ms, calories, avg_hr, max_hr, location, source, activity)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'garmin',$12)
           RETURNING id, workout_date`,
          [
            name,
            csvFileName(r),
            r.sport,
            r.workout_date,
            r.duration_s,
            r.distance_m,
            avgSpeed,
            r.calories,
            r.avg_hr,
            r.max_hr,
            r.location,
            r.activity,
          ]
        );
        imported.push(res.rows[0]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return NextResponse.json({ imported: imported.length, skipped: skipped.length, rows: imported });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Import failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
