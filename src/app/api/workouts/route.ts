import { NextRequest, NextResponse } from 'next/server';
import { pool, initSchema } from '@/lib/db';
import { parseWorkoutFile } from '@/lib/parsers';
import { TEAMMATES } from '@/lib/teammates';

export async function GET() {
  await initSchema();
  const result = await pool.query('SELECT * FROM workouts ORDER BY workout_date DESC');
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const location = (formData.get('location') as string) || null;
    const file = formData.get('file') as File;

    if (!name || !TEAMMATES.includes(name as typeof TEAMMATES[number])) {
      return NextResponse.json({ error: 'Invalid teammate name' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const ext = fileName.endsWith('.fit') ? 'fit' : fileName.endsWith('.gpx') ? 'gpx' : null;

    if (!ext) {
      return NextResponse.json({ error: 'Only .fit and .gpx files are supported' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = await parseWorkoutFile(buffer, ext as 'fit' | 'gpx');

    await initSchema();
    const result = await pool.query(
      `INSERT INTO workouts (name, file_name, file_type, workout_date, duration_s, distance_m, avg_speed_ms, max_speed_ms, avg_hr, max_hr, calories, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        name,
        file.name,
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
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Failed to parse workout file' }, { status: 500 });
  }
}
