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
