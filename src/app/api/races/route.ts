import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const races = db.prepare('SELECT * FROM races ORDER BY race_date ASC').all();
  return NextResponse.json(races);
}

export async function POST(req: NextRequest) {
  try {
    const { name, race_date, location, logo } = await req.json();

    if (!name || !race_date) {
      return NextResponse.json({ error: 'Name and date are required' }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO races (name, race_date, location, logo) VALUES (?, ?, ?, ?)'
    ).run(name, race_date, location ?? null, logo ?? null);

    const saved = db.prepare('SELECT * FROM races WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error('Race insert error:', err);
    return NextResponse.json({ error: 'Failed to add race' }, { status: 500 });
  }
}
