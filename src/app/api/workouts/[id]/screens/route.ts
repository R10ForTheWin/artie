import { NextRequest, NextResponse } from 'next/server';
import { pool, initSchema } from '@/lib/db';
import { readGarminScreen } from '@/lib/parsers/garminScreen';
import { mergeReads, applyPolicy, fillWorkout, saveScreens } from '@/lib/workoutBundle';
import { isActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

/** Screenshots added to a workout that is already logged: read, fill gaps, keep the images. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initSchema();
    const { id } = await params;
    const w = await pool.query('SELECT id, name, activity FROM workouts WHERE id = $1', [id]);
    if (!w.rows[0]) return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    const { name, activity } = w.rows[0];

    const files = (await req.formData()).getAll('screen').filter((f): f is File => f instanceof File);
    if (!files.length) return NextResponse.json({ error: 'No screenshots attached.' }, { status: 400 });

    const buffers = await Promise.all(files.map(async (f) => Buffer.from(await f.arrayBuffer())));
    const reads = await Promise.all(buffers.map((b) => readGarminScreen(b)));
    const merged = await applyPolicy(name, isActivity(activity) ? activity : 'paddle', mergeReads(null, reads));
    await fillWorkout(Number(id), merged);
    await saveScreens(Number(id), reads.map((r, i) => ({ kind: r.kind, buffer: buffers[i] })));

    return NextResponse.json({ kinds: reads.map((r) => r.kind) });
  } catch (err) {
    console.error('Screens error:', err);
    return NextResponse.json({ error: 'Could not read those screenshots.' }, { status: 500 });
  }
}
