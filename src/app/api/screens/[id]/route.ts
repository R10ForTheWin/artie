import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

/** A saved workout screenshot. They never change once stored, so cache hard. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await pool.query('SELECT mime, data FROM workout_screens WHERE id = $1', [id]);
  if (!r.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return new NextResponse(new Uint8Array(r.rows[0].data), {
    headers: { 'Content-Type': r.rows[0].mime, 'Cache-Control': 'private, max-age=31536000, immutable' },
  });
}
