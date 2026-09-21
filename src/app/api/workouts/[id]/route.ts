import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { isActivity } from '@/lib/activity';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await pool.query(
    'DELETE FROM workouts WHERE id = $1 RETURNING id, name, workout_date',
    [id]
  );
  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
  }
  // Remember the deletion so a later CSV or Reggie import doesn't put it back.
  const { name, workout_date } = result.rows[0];
  await pool.query(
    `INSERT INTO deleted_workouts (name, workout_date) VALUES ($1, $2)
     ON CONFLICT (name, workout_date) DO NOTHING`,
    [name, workout_date]
  );
  return NextResponse.json({ deleted: id });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, location, workout_date, activity } = body;
  const nextActivity = isActivity(activity) ? activity : null;

  const result = await pool.query(
    `UPDATE workouts SET name = $1, location = $2, workout_date = $3,
            activity = COALESCE($5, activity)
     WHERE id = $4 RETURNING *`,
    [name, location || null, workout_date, id, nextActivity]
  );
  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
  }
  return NextResponse.json(result.rows[0]);
}
