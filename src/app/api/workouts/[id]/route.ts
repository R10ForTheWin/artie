import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await pool.query('DELETE FROM workouts WHERE id = $1 RETURNING id', [id]);
  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: id });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, location, workout_date } = body;

  const result = await pool.query(
    `UPDATE workouts SET name = $1, location = $2, workout_date = $3 WHERE id = $4 RETURNING *`,
    [name, location || null, workout_date, id]
  );
  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
  }
  return NextResponse.json(result.rows[0]);
}
