import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { fetchPaddleGuruResults } from '@/lib/paddleguru';
import { TEAMMATES } from '@/lib/teammates';

function findTeammate(fullName: string): string | null {
  const lower = fullName.toLowerCase();
  for (const t of TEAMMATES) {
    if (lower.includes(t.toLowerCase())) return t;
  }
  return null;
}

function parseTimeToSeconds(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { rows } = await pool.query('SELECT id, name, race_date, paddleguru_url, distance_m FROM races WHERE id = $1', [id]);
  if (!rows[0]) {
    return NextResponse.json({ error: 'Race not found' }, { status: 404 });
  }

  const race = rows[0];
  if (!race.paddleguru_url) {
    return NextResponse.json({ error: 'No PaddleGuru URL configured for this race' }, { status: 400 });
  }

  let results;
  try {
    results = await fetchPaddleGuruResults(race.paddleguru_url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (results.length === 0) {
    return NextResponse.json({ error: 'No timed results found on PaddleGuru yet' }, { status: 404 });
  }

  await pool.query('UPDATE races SET results = $1 WHERE id = $2', [JSON.stringify(results), id]);

  // Auto-create workouts for teammates found in results
  if (race.distance_m && race.race_date) {
    for (const result of results) {
      const teammate = findTeammate(result.name);
      if (!teammate) continue;

      const duration_s = parseTimeToSeconds(result.time) || null;
      const raceDate = race.race_date.slice(0, 10);
      const fileName = `paddleguru-${race.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${raceDate}`;

      // Delete any previously auto-created paddleguru workout for this person/date
      await pool.query(
        `DELETE FROM workouts WHERE name = $1 AND workout_date = $2 AND source = 'paddleguru'`,
        [teammate, raceDate]
      );

      // Skip if a real (non-paddleguru) workout already exists for this person/date
      const existing = await pool.query(
        `SELECT id FROM workouts WHERE name = $1 AND workout_date = $2 AND (source IS NULL OR source != 'paddleguru')`,
        [teammate, raceDate]
      );
      if (existing.rows.length > 0) continue;

      await pool.query(
        `INSERT INTO workouts (name, file_name, file_type, workout_date, duration_s, distance_m, source)
         VALUES ($1, $2, 'manual', $3, $4, $5, 'paddleguru')`,
        [teammate, fileName, raceDate, duration_s, race.distance_m]
      );
    }
  }

  return NextResponse.json({ count: results.length, results });
}
