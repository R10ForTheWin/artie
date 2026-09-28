import { NextRequest, NextResponse } from 'next/server';
import { pool, initSchema, isCrossSourceDuplicate } from '@/lib/db';
import { sessionName } from '@/lib/auth';
import { isKnownPaddler } from '@/lib/people';
import { isActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

const TO_METERS: Record<string, number> = { mi: 1609.344, yd: 0.9144, m: 1, km: 1000 };

/** "1:05:30", "45:10" or "45" (minutes) → seconds */
function parseDuration(raw: unknown): number | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const parts = raw.trim().split(':').map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return NaN;
  if (parts.length === 1) return Math.round(parts[0] * 60);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return NaN;
}

/** A workout typed in by hand — for anything without a file, link or screenshot. */
export async function POST(req: NextRequest) {
  try {
    await initSchema();
    const body = await req.json().catch(() => ({}));
    let name = String(body.name ?? '');
    const signedIn = await sessionName(req);
    if (signedIn) name = signedIn;
    if (!name || !(await isKnownPaddler(name))) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

    if (!isActivity(body.activity)) return NextResponse.json({ error: 'Pick paddle, ocean swim or pool swim.' }, { status: 400 });
    const activity = body.activity;

    const date = String(body.date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'Pick a date.' }, { status: 400 });
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
    if (date > today) return NextResponse.json({ error: "That date hasn't happened yet." }, { status: 400 });

    const factor = TO_METERS[String(body.unit)];
    const amount = Number(body.distance);
    if (!factor || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Enter a distance.' }, { status: 400 });
    const distance_m = amount * factor;
    if (distance_m > 100 * 1609.344) return NextResponse.json({ error: 'That distance looks too long — check the units.' }, { status: 400 });

    const duration_s = parseDuration(body.duration);
    if (Number.isNaN(duration_s)) return NextResponse.json({ error: 'Time should look like 1:05:30 or 45:10.' }, { status: 400 });

    const location = typeof body.location === 'string' && body.location.trim() ? body.location.trim().slice(0, 60) : null;

    if (await isCrossSourceDuplicate(name, date, distance_m)) {
      return NextResponse.json({ error: 'You already have a workout that day with about that distance.' }, { status: 409 });
    }

    const r = await pool.query(
      `INSERT INTO workouts (name, file_name, file_type, workout_date, duration_s, distance_m, avg_speed_ms, location, activity, source)
       VALUES ($1, $2, 'manual', $3, $4, $5, $6, $7, $8, 'manual') RETURNING id`,
      [name, `manual-${date}-${Date.now()}`, date, duration_s, distance_m, duration_s ? distance_m / duration_s : null, location, activity]
    );
    return NextResponse.json({ id: r.rows[0].id, distance_m, workout_date: date, activity }, { status: 201 });
  } catch (err) {
    console.error('Manual entry error:', err);
    return NextResponse.json({ error: 'Could not save that workout.' }, { status: 500 });
  }
}
