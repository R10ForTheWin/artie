import { pool, isCrossSourceDuplicate } from './db';
import { classifyActivity } from './activity';

const CLIENT_ID = process.env.STRAVA_CLIENT_ID!;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!;

const PADDLE_SPORTS = new Set([
  'StandUpPaddling', 'Canoeing', 'Kayaking', 'Rowing', 'Paddling',
]);

const SWIM_SPORTS = new Set(['Swim']);

const IMPORTED_SPORTS = new Set([...PADDLE_SPORTS, ...SWIM_SPORTS]);

/**
 * Garmin has no prone profile, so some teammates (Zach) record paddles as a
 * generic activity that reaches Strava as "Workout". A Workout with GPS and real
 * distance is a paddle; gym sessions have neither.
 */
function isGpsWorkout(a: any): boolean {
  return a?.sport_type === 'Workout'
    && Array.isArray(a.start_latlng) && a.start_latlng.length === 2
    && (a.distance ?? 0) >= 400;
}

function isPaddle(a: any): boolean {
  return PADDLE_SPORTS.has(a?.sport_type) || isGpsWorkout(a);
}

function isImported(a: any): boolean {
  return IMPORTED_SPORTS.has(a?.sport_type) || isGpsWorkout(a);
}

const MILE_M = 1609.344;

interface StravaToken {
  name: string;
  athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

async function getTokenByAthleteId(athleteId: number): Promise<StravaToken | null> {
  const r = await pool.query('SELECT * FROM strava_tokens WHERE athlete_id = $1', [athleteId]);
  return r.rows[0] ?? null;
}

async function refreshIfNeeded(token: StravaToken): Promise<StravaToken> {
  if (Date.now() / 1000 < token.expires_at - 300) return token;
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  await pool.query(
    'UPDATE strava_tokens SET access_token=$1, refresh_token=$2, expires_at=$3 WHERE athlete_id=$4',
    [data.access_token, data.refresh_token, data.expires_at, token.athlete_id]
  );
  return { ...token, access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at };
}

export async function backfillSplitsFromStrava(name: string): Promise<number> {
  const tokenRow = await pool.query('SELECT * FROM strava_tokens WHERE name = $1', [name]);
  if (tokenRow.rows.length === 0) return 0;
  let token = tokenRow.rows[0] as StravaToken;
  token = await refreshIfNeeded(token);

  // Paddles with no splits, or fewer than the distance calls for (a screenshot
  // that caught only some laps), however far back. More splits = more chances
  // at a record.
  const workoutsRes = await pool.query(
    `SELECT id, workout_date, distance_m FROM workouts
     WHERE name = $1 AND file_name NOT LIKE 'strava-%' AND distance_m IS NOT NULL
       AND (activity = 'paddle' OR activity IS NULL)
       AND (mile_splits IS NULL OR jsonb_array_length(mile_splits) < FLOOR(distance_m / 1609.344) - 1)`,
    [name]
  );
  if (workoutsRes.rows.length === 0) return 0;

  // Every paddle in their Strava history (capped at 3,000 activities)
  const activities: any[] = [];
  let page = 1;
  while (page <= 30) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${token.access_token}` } }
    );
    if (!res.ok) break;
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    activities.push(...batch.filter(isPaddle));
    if (batch.length < 100) break;
    page++;
  }

  let backfilled = 0;
  for (const workout of workoutsRes.rows) {
    const workoutDate = (workout.workout_date instanceof Date
      ? workout.workout_date.toISOString()
      : String(workout.workout_date)
    ).split('T')[0];
    const workoutDist: number | null = workout.distance_m;

    const match = activities.find((a: any) => {
      const actDate = (a.start_date_local ?? a.start_date ?? '').split('T')[0];
      if (actDate !== workoutDate) return false;
      if (!workoutDist || !a.distance) return false;
      return Math.abs(a.distance - workoutDist) / workoutDist < 0.05;
    });
    if (!match) continue;

    const streamsRes = await fetch(
      `https://www.strava.com/api/v3/activities/${match.id}/streams?keys=distance,time&key_by_type=true`,
      { headers: { Authorization: `Bearer ${token.access_token}` } }
    );
    if (!streamsRes.ok) continue;
    const streams = await streamsRes.json();

    const distances: number[] = streams?.distance?.data ?? [];
    const times: number[] = streams?.time?.data ?? [];
    if (distances.length <= 1 || times.length !== distances.length) continue;

    const splits: number[] = [];
    let mileCount = 1;
    let lastMileTime = 0;
    for (let i = 1; i < distances.length; i++) {
      while (distances[i] >= mileCount * MILE_M) {
        const d0 = distances[i - 1], d1 = distances[i];
        const t0 = times[i - 1], t1 = times[i];
        const frac = (mileCount * MILE_M - d0) / (d1 - d0);
        const crossingTime = t0 + frac * (t1 - t0);
        splits.push(Math.round(crossingTime - lastMileTime));
        lastMileTime = crossingTime;
        mileCount++;
      }
    }
    if (splits.length === 0) continue;

    await pool.query('UPDATE workouts SET mile_splits = $1 WHERE id = $2', [
      JSON.stringify(splits),
      workout.id,
    ]);
    backfilled++;
  }

  console.log(`[strava] backfilled splits for ${backfilled} workouts (${name})`);
  return backfilled;
}

/** Mile splits (seconds per mile) from a Strava activity's GPS streams, or null. */
async function mileSplitsFor(activityId: number, accessToken: string): Promise<number[] | null> {
  const res = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=distance,time&key_by_type=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const streams = await res.json();
  const distances: number[] = streams?.distance?.data ?? [];
  const times: number[] = streams?.time?.data ?? [];
  if (distances.length <= 1 || times.length !== distances.length) return null;
  const splits: number[] = [];
  let mileCount = 1;
  let lastMileTime = 0;
  for (let i = 1; i < distances.length; i++) {
    while (distances[i] >= mileCount * MILE_M) {
      const d0 = distances[i - 1], d1 = distances[i];
      const t0 = times[i - 1], t1 = times[i];
      const crossingTime = t0 + ((mileCount * MILE_M - d0) / (d1 - d0)) * (t1 - t0);
      splits.push(Math.round(crossingTime - lastMileTime));
      lastMileTime = crossingTime;
      mileCount++;
    }
  }
  return splits.length > 0 ? splits : null;
}

/**
 * Strava's copy was skipped because the paddle was already added another way.
 * If that entry has no mile splits, give it Strava's so they aren't lost.
 */
async function giveSplitsToMatch(
  name: string, date: string, activity: string, distance_m: number | null, activityId: number, accessToken: string
) {
  if (activity !== 'paddle') return;
  const r = await pool.query(
    `SELECT id FROM workouts
     WHERE name = $1 AND LEFT(workout_date, 10) = $2 AND (activity = 'paddle' OR activity IS NULL)
       AND mile_splits IS NULL AND (source IS NULL OR source != 'paddleguru')
       AND (distance_m IS NULL OR $3::real IS NULL OR ABS(distance_m - $3) / GREATEST(distance_m, $3) < 0.2)
     ORDER BY ABS(COALESCE(distance_m, 0) - COALESCE($3::real, 0)) LIMIT 1`,
    [name, date, distance_m]
  );
  if (!r.rows[0]) return;
  const splits = await mileSplitsFor(activityId, accessToken);
  if (splits) await pool.query('UPDATE workouts SET mile_splits = $1 WHERE id = $2', [JSON.stringify(splits), r.rows[0].id]);
}

/** Total distance of this athlete's same-kind Strava sessions on act's local day. */
async function stravaDayTotal(act: any, activity: string, accessToken: string): Promise<number> {
  const day = String(act.start_date_local).slice(0, 10);
  const t = Math.floor(Date.parse(act.start_date) / 1000);
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=50&after=${t - 86400}&before=${t + 86400}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return act.distance;
  const list = await res.json();
  if (!Array.isArray(list)) return act.distance;
  const same = list.filter((a: any) =>
    String(a.start_date_local).slice(0, 10) === day && isImported(a)
    && classifyActivity(isGpsWorkout(a) ? 'Paddling' : a.sport_type) === activity);
  if (!same.some((a: any) => a.id === act.id)) same.push(act);
  return same.reduce((sum: number, a: any) => sum + (a.distance ?? 0), 0);
}

export async function importStravaActivity(athleteId: number, activityId: number): Promise<'imported' | 'skipped' | 'duplicate'> {
  let token = await getTokenByAthleteId(athleteId);
  if (!token) throw new Error(`No Strava token for athlete ${athleteId}`);
  token = await refreshIfNeeded(token);

  const actRes = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!actRes.ok) throw new Error(`Strava API error: ${actRes.status}`);
  const act = await actRes.json();

  if (!isImported(act)) return 'skipped';

  const activity = classifyActivity(act.sport_type);

  const workout_date = (act.start_date_local ?? act.start_date ?? new Date().toISOString()).split('T')[0];

  // Deduplicate: same file (exact) or same person/date/distance (cross-source)
  const existing = await pool.query(
    'SELECT id FROM workouts WHERE name=$1 AND file_name=$2',
    [token.name, `strava-${activityId}`]
  );
  if (existing.rows.length > 0) return 'duplicate';
  if (await isCrossSourceDuplicate(token.name, workout_date, act.distance ?? null)) {
    await giveSplitsToMatch(token.name, workout_date, activity, act.distance ?? null, activityId, token.access_token);
    return 'duplicate';
  }
  // Teammates may still add the same session another way (screenshot, file,
  // pool log). Those can read the distance loosely or not at all, so a same-day
  // entry of the same kind (paddle vs swim) within 20%, or with no distance,
  // counts as this session.
  const sameKind = activity === 'paddle'
    ? `(activity = 'paddle' OR activity IS NULL)`
    : `activity = 'swim'`;
  const sameDay = await pool.query(
    `SELECT id FROM workouts
     WHERE name = $1 AND LEFT(workout_date, 10) = $2 AND ${sameKind}
       AND (source IS NULL OR source != 'paddleguru')
       AND (distance_m IS NULL OR $3::real IS NULL
            OR ABS(distance_m - $3) / GREATEST(distance_m, $3) < 0.2)
     LIMIT 1`,
    [token.name, workout_date, act.distance ?? null]
  );
  if (sameDay.rows.length > 0) {
    await giveSplitsToMatch(token.name, workout_date, activity, act.distance ?? null, activityId, token.access_token);
    return 'duplicate';
  }

  // A hand-logged day can cover two Strava sessions (Zach's 11.5 mi on Oct 5 =
  // 6.18 + 5.54). If one same-day entry matches that day's Strava total, this
  // session is already counted in it.
  if (act.distance) {
    const others = await pool.query(
      `SELECT distance_m FROM workouts
       WHERE name = $1 AND LEFT(workout_date, 10) = $2 AND ${sameKind}
         AND file_name NOT LIKE 'strava-%' AND distance_m IS NOT NULL`,
      [token.name, workout_date]
    );
    if (others.rows.length > 0) {
      const dayTotal = await stravaDayTotal(act, activity, token.access_token);
      if (others.rows.some((r) => Math.abs(r.distance_m - dayTotal) / Math.max(r.distance_m, dayTotal) < 0.2)) {
        return 'duplicate';
      }
    }
  }

  const mile_splits = await mileSplitsFor(activityId, token.access_token);

  await pool.query(
    `INSERT INTO workouts (name, file_name, file_type, workout_date, duration_s, distance_m, avg_speed_ms, max_speed_ms, avg_hr, max_hr, calories, mile_splits, activity)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      token.name,
      `strava-${activityId}`,
      act.sport_type ?? 'Paddling',
      workout_date,
      act.elapsed_time ?? null,
      act.distance ?? null,
      act.average_speed ?? null,
      act.max_speed ?? null,
      act.average_heartrate ? Math.round(act.average_heartrate) : null,
      act.max_heartrate ? Math.round(act.max_heartrate) : null,
      act.calories ?? null,
      mile_splits ? JSON.stringify(mile_splits) : null,
      activity,
    ]
  );

  return 'imported';
}

/**
 * Right after someone connects, pull their history since `sinceIso` (a date).
 * Each goes through importStravaActivity, so anything already added is skipped.
 */
export async function importRecentFromStrava(name: string, sinceIso: string): Promise<number> {
  const row = await pool.query('SELECT * FROM strava_tokens WHERE name = $1', [name]);
  if (row.rows.length === 0) return 0;
  const token = await refreshIfNeeded(row.rows[0] as StravaToken);
  const after = Math.floor(Date.parse(`${sinceIso}T00:00:00-08:00`) / 1000);
  const acts: any[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}&after=${after}`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!res.ok) break;
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    acts.push(...batch);
    if (batch.length < 100) break;
  }
  let imported = 0;
  for (const a of acts) {
    if (!isImported(a)) continue;
    if ((await importStravaActivity(token.athlete_id, a.id)) === 'imported') imported++;
  }
  return imported;
}

export type StravaAppStatus = 'ok' | 'inactive' | 'no-connection' | 'unknown';

let statusCache: { value: StravaAppStatus; at: number } | null = null;
const STATUS_TTL_MS = 5 * 60 * 1000;

/**
 * Strava's Developer Program (June 2026) requires the account that OWNS the API
 * application to hold an active Strava subscription. When it lapses, every call
 * returns 403 with resource "Application" / code "Inactive" — for every athlete,
 * regardless of their own subscription. Surfaced on /strava so a dead sync is
 * visible instead of silently importing nothing.
 */
export async function checkStravaAppStatus(): Promise<StravaAppStatus> {
  if (statusCache && Date.now() - statusCache.at < STATUS_TTL_MS) return statusCache.value;

  const cache = (value: StravaAppStatus) => {
    statusCache = { value, at: Date.now() };
    return value;
  };

  const r = await pool.query('SELECT * FROM strava_tokens LIMIT 1');
  const token: StravaToken | undefined = r.rows[0];
  if (!token) return cache('no-connection');

  try {
    const res = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (res.ok) return cache('ok');
    if (res.status === 401) return cache('ok'); // stale token, not an app-level problem
    if (res.status === 403) {
      const body = await res.json().catch(() => null);
      const inactive = body?.errors?.some(
        (e: { resource?: string; code?: string }) => e.resource === 'Application' && e.code === 'Inactive'
      );
      return cache(inactive ? 'inactive' : 'unknown');
    }
    return cache('unknown');
  } catch {
    return cache('unknown');
  }
}
