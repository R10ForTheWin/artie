import { pool } from './db';

const CLIENT_ID = process.env.STRAVA_CLIENT_ID!;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!;

const PADDLE_SPORTS = new Set([
  'StandUpPaddling', 'Surfing', 'Canoeing', 'Kayaking', 'Rowing', 'Paddling',
]);

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

export async function importStravaActivity(athleteId: number, activityId: number): Promise<'imported' | 'skipped' | 'duplicate'> {
  let token = await getTokenByAthleteId(athleteId);
  if (!token) throw new Error(`No Strava token for athlete ${athleteId}`);
  token = await refreshIfNeeded(token);

  const actRes = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!actRes.ok) throw new Error(`Strava API error: ${actRes.status}`);
  const act = await actRes.json();

  if (!PADDLE_SPORTS.has(act.sport_type)) return 'skipped';

  // Deduplicate
  const existing = await pool.query(
    'SELECT id FROM workouts WHERE name=$1 AND file_name=$2',
    [token.name, `strava-${activityId}`]
  );
  if (existing.rows.length > 0) return 'duplicate';

  // Fetch streams for mile splits
  let mile_splits: number[] | null = null;
  const streamsRes = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=distance,time&key_by_type=true`,
    { headers: { Authorization: `Bearer ${token.access_token}` } }
  );
  if (streamsRes.ok) {
    const streams = await streamsRes.json();
    const distances: number[] = streams?.distance?.data ?? [];
    const times: number[] = streams?.time?.data ?? [];
    if (distances.length > 1 && times.length === distances.length) {
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
      if (splits.length > 0) mile_splits = splits;
    }
  }

  const workout_date = (act.start_date_local ?? act.start_date ?? new Date().toISOString()).split('T')[0];

  await pool.query(
    `INSERT INTO workouts (name, file_name, file_type, workout_date, duration_s, distance_m, avg_speed_ms, max_speed_ms, avg_hr, max_hr, calories, mile_splits)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      token.name,
      `strava-${activityId}`,
      'gpx',
      workout_date,
      act.elapsed_time ?? null,
      act.distance ?? null,
      act.average_speed ?? null,
      act.max_speed ?? null,
      act.average_heartrate ? Math.round(act.average_heartrate) : null,
      act.max_heartrate ? Math.round(act.max_heartrate) : null,
      act.calories ?? null,
      mile_splits ? JSON.stringify(mile_splits) : null,
    ]
  );

  return 'imported';
}
