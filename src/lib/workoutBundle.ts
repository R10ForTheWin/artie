import { pool } from './db';
import { classifyActivity, type Activity } from './activity';
import { usesHrMonitor } from './people';
import { prepareImage, type ScreenFields, type ScreenKind, type ScreenRead } from './parsers/garminScreen';

/** What a pasted Garmin link contributes — the summary line and a map thumbnail. */
export interface LinkRead {
  activityId: string;
  distance_m: number | null;
  duration_s: number | null;
  avg_speed_ms: number | null;
  map_image_url: string | null;
  title: string | null;
}

export type Merged = ScreenFields & { map_image_url: string | null };

// When two sources disagree, the earlier one wins: the link is Garmin's own
// summary, and each tab is most trustworthy for what it is built to show.
const ORDER: (ScreenKind | 'link')[] = ['link', 'overview', 'stats', 'laps', 'charts', 'share', 'other'];

export function mergeReads(link: LinkRead | null, screens: ScreenRead[]): Merged {
  const sources: { kind: ScreenKind | 'link'; fields: Partial<Merged> }[] = [
    ...(link ? [{ kind: 'link' as const, fields: link }] : []),
    ...screens,
  ].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));

  const keys: (keyof Merged)[] = [
    'workout_date', 'start_time', 'title', 'sport', 'distance_m', 'duration_s', 'moving_time_s',
    'avg_speed_ms', 'max_speed_ms', 'best_pace_s', 'calories', 'avg_hr', 'max_hr',
    'total_strokes', 'avg_stroke_rate', 'max_stroke_rate', 'distance_per_stroke_ft',
    'mile_splits', 'training_effect_aerobic', 'training_effect_anaerobic', 'weather_temp_f', 'map_image_url',
  ];
  const out = {} as Record<keyof Merged, unknown>;
  for (const k of keys) {
    out[k] = sources.map((s) => s.fields[k]).find((v) => v !== null && v !== undefined) ?? null;
  }
  return out as Merged;
}

/**
 * Readings the crew has said not to trust: heart rate unless you wear a chest
 * strap, and stroke counts on a paddle (they only mean something for swimming).
 */
export async function applyPolicy(name: string, activity: Activity, m: Merged): Promise<Merged> {
  const out = { ...m };
  if (!(await usesHrMonitor(name))) { out.avg_hr = null; out.max_hr = null; }
  if (activity === 'paddle') {
    out.total_strokes = null; out.avg_stroke_rate = null; out.max_stroke_rate = null; out.distance_per_stroke_ft = null;
  }
  return out;
}

export const activityFor = (m: Merged): Activity => classifyActivity(m.sport ?? m.title);

/** Today in Pacific time, for a workout with no date anywhere on it. */
export function todayPacific(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
}

/** An existing workout this bundle is really the same session as, if any. */
export async function findExisting(name: string, fileName: string | null, date: string, distance_m: number | null): Promise<number | null> {
  if (fileName) {
    const r = await pool.query('SELECT id FROM workouts WHERE name = $1 AND file_name = $2 LIMIT 1', [name, fileName]);
    if (r.rows[0]) return r.rows[0].id;
  }
  if (distance_m) {
    const r = await pool.query(
      `SELECT id FROM workouts
       WHERE name = $1 AND LEFT(workout_date, 10) = $2 AND distance_m IS NOT NULL
         AND (source IS NULL OR source != 'paddleguru')
         AND ABS(distance_m - $3) / GREATEST(distance_m, $3) < 0.05
       ORDER BY id LIMIT 1`,
      [name, date, distance_m]
    );
    if (r.rows[0]) return r.rows[0].id;
  }
  return null;
}

const COLUMNS = [
  'duration_s', 'distance_m', 'avg_speed_ms', 'max_speed_ms', 'avg_hr', 'max_hr', 'calories',
  'start_time', 'moving_time_s', 'best_pace_s', 'total_strokes', 'avg_stroke_rate', 'max_stroke_rate',
  'distance_per_stroke_ft', 'training_effect_aerobic', 'training_effect_anaerobic', 'weather_temp_f', 'map_image_url',
] as const;

const valueFor = (m: Merged, c: (typeof COLUMNS)[number]) => m[c] ?? null;

export async function insertWorkout(name: string, fileName: string, activity: Activity, m: Merged): Promise<number> {
  const date = m.workout_date ?? todayPacific();
  // Replace any auto-created PaddleGuru placeholder for this person and day
  await pool.query(`DELETE FROM workouts WHERE name = $1 AND workout_date = $2 AND source = 'paddleguru'`, [name, date]);
  const cols = ['name', 'file_name', 'file_type', 'workout_date', 'activity', 'location', 'mile_splits', ...COLUMNS];
  const vals = [
    name, fileName, 'garmin-screens', date, activity, locationFrom(m.title),
    m.mile_splits ? JSON.stringify(m.mile_splits) : null,
    ...COLUMNS.map((c) => valueFor(m, c)),
  ];
  const r = await pool.query(
    `INSERT INTO workouts (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
    vals
  );
  return r.rows[0].id;
}

/** Fill in what an existing workout is missing; never overwrite what it has. */
export async function fillWorkout(id: number, m: Merged): Promise<void> {
  const sets = COLUMNS.map((c, i) => `${c} = COALESCE(${c}, $${i + 2})`);
  const splitsIdx = COLUMNS.length + 2;
  await pool.query(
    `UPDATE workouts SET ${sets.join(', ')},
       mile_splits = CASE WHEN mile_splits IS NULL OR jsonb_array_length(mile_splits) = 0 THEN $${splitsIdx}::jsonb ELSE mile_splits END
     WHERE id = $1`,
    [id, ...COLUMNS.map((c) => valueFor(m, c)), m.mile_splits ? JSON.stringify(m.mile_splits) : null]
  );
}

export async function saveScreens(workoutId: number, screens: { kind: ScreenKind; buffer: Buffer }[]): Promise<void> {
  for (const s of screens) {
    // One of each tab: a newer Overview/Stats/Laps/Charts replaces the old one,
    // so adding the same screenshots twice doesn't stack up copies
    if (['overview', 'stats', 'laps', 'charts'].includes(s.kind)) {
      await pool.query('DELETE FROM workout_screens WHERE workout_id = $1 AND kind = $2', [workoutId, s.kind]);
    }
    const small = await prepareImage(s.buffer, 1100, 78);
    await pool.query('INSERT INTO workout_screens (workout_id, kind, mime, data) VALUES ($1, $2, $3, $4)', [
      workoutId, s.kind, 'image/jpeg', small,
    ]);
  }
}

/** "Redondo Beach Paddleboarding" → "Redondo Beach" */
function locationFrom(title: string | null): string | null {
  if (!title) return null;
  const place = title.replace(/\s*(stand up )?(paddleboarding|paddling|sup|open water swimming|swimming|pool swim|swim)\s*$/i, '').trim();
  return place && place.toLowerCase() !== title.toLowerCase() ? place : null;
}

/** One short line per piece, for the upload list. */
export function describeRead(r: ScreenRead): string {
  const f = r.fields;
  const mi = f.distance_m ? `${(f.distance_m / 1609.344).toFixed(2)} mi` : null;
  const clock = (s: number | null) => {
    if (!s) return null;
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.round(s % 60);
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
  };
  const bits: (string | null)[] = [];
  if (r.kind === 'laps' && f.mile_splits) {
    const best = Math.min(...f.mile_splits);
    bits.push(`${f.mile_splits.length} mile splits`, `fastest ${clock(best)} (mile ${f.mile_splits.indexOf(best) + 1})`);
  } else if (r.kind === 'charts') {
    bits.push(f.best_pace_s ? `best pace ${clock(f.best_pace_s)}` : null,
      f.training_effect_aerobic !== null ? `training effect ${f.training_effect_aerobic}` : null);
  } else if (r.kind === 'stats') {
    bits.push(f.moving_time_s ? `moving ${clock(f.moving_time_s)}` : null,
      f.best_pace_s ? `best pace ${clock(f.best_pace_s)}` : null,
      f.max_speed_ms ? `max ${(f.max_speed_ms / 0.44704).toFixed(1)} mph` : null,
      f.total_strokes ? `${f.total_strokes.toLocaleString()} strokes` : null,
      f.avg_hr ? `HR ${f.avg_hr}` : null);
  } else {
    bits.push(f.workout_date, f.start_time, mi, clock(f.duration_s), f.weather_temp_f ? `${f.weather_temp_f}°` : null);
  }
  return bits.filter(Boolean).join(' · ') || 'nothing readable';
}
