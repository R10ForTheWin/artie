import { NextRequest, NextResponse } from 'next/server';
import { pool, initSchema } from '@/lib/db';

export async function GET() {
  await initSchema();
  const result = await pool.query('SELECT * FROM races ORDER BY race_date ASC');
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  try {
    const { name, race_date, location, logo } = await req.json();

    if (!name || !race_date) {
      return NextResponse.json({ error: 'Name and date are required' }, { status: 400 });
    }

    await initSchema();
    const result = await pool.query(
      'INSERT INTO races (name, race_date, location, logo) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, race_date, location ?? null, logo ?? null]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error('Race insert error:', err);
    return NextResponse.json({ error: 'Failed to add race' }, { status: 500 });
  }
}
