import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { fetchPaddleGuruResults } from '@/lib/paddleguru';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { rows } = await pool.query('SELECT id, name, paddleguru_url FROM races WHERE id = $1', [id]);
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

  return NextResponse.json({ count: results.length, results });
}
