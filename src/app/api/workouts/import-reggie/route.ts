import { NextRequest, NextResponse } from 'next/server';
import { pool, initSchema } from '@/lib/db';
import { reggieConfig, fetchReggiePractices, yardsToMeters, poolFromClassName } from '@/lib/reggie';

export const dynamic = 'force-dynamic';

/**
 * Imports DJ's completed SCAQ practices from Reggie's tally as pool swims.
 * `commit=false` previews. A practice Reggie is still guessing at (yardage not
 * confirmed by the swimmer) lands as source 'estimate', so it can be swapped for
 * real watch data later with one delete.
 */
export async function POST(req: NextRequest) {
  const cfg = reggieConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: 'Reggie is not configured — set REGGIE_URL and REGGIE_TALLY_KEY.' },
      { status: 501 }
    );
  }

  try {
    await initSchema();
    const commit = new URL(req.url).searchParams.get('commit') === 'true';
    const practices = await fetchReggiePractices(cfg);

    if (practices.length === 0) {
      return NextResponse.json({ preview: !commit, total: 0, toImport: [], skipped: 0 });
    }

    const dates = [...new Set(practices.map((p) => p.date!))];
    const { rows: existing } = await pool.query(
      'SELECT workout_date FROM workouts WHERE name = $1 AND workout_date = ANY($2)',
      [cfg.athlete, dates]
    );
    // Dedupe on the date, not the practice id: a Garmin swim for the same day is
    // a real measurement and should win over Reggie's tally.
    const taken = new Set(existing.map((e: { workout_date: string }) => e.workout_date));

    const { rows: tombstones } = await pool.query(
      'SELECT workout_date FROM deleted_workouts WHERE name = $1 AND workout_date = ANY($2)',
      [cfg.athlete, dates]
    );
    for (const t of tombstones) taken.add(t.workout_date);

    const toImport = practices.filter((p) => !taken.has(p.date!));

    if (!commit) {
      return NextResponse.json({
        preview: true,
        athlete: cfg.athlete,
        total: practices.length,
        skipped: practices.length - toImport.length,
        toImport: toImport.map((p) => ({
          date: p.date,
          name: p.name,
          yards: p.yards,
          distance_m: yardsToMeters(p.yards),
          confirmed: p.confirmed,
        })),
      });
    }

    const client = await pool.connect();
    let imported = 0;
    try {
      await client.query('BEGIN');
      for (const p of toImport) {
        await client.query(
          `INSERT INTO workouts
             (name, file_name, file_type, workout_date, duration_s, distance_m,
              location, source, activity)
           VALUES ($1,$2,'Pool Swim',$3,NULL,$4,$5,$6,'pool_swim')`,
          [
            cfg.athlete,
            `reggie-practice-${p.id}`,
            p.date,
            yardsToMeters(p.yards),
            poolFromClassName(p.name),
            p.confirmed ? 'reggie' : 'estimate',
          ]
        );
        imported++;
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return NextResponse.json({ imported, skipped: practices.length - toImport.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Reggie import failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
