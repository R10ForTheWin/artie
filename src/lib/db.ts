import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function isCrossSourceDuplicate(name: string, date: string, distance_m: number | null): Promise<boolean> {
  if (!distance_m) return false;
  const r = await pool.query(
    `SELECT id FROM workouts
     WHERE name = $1 AND workout_date = $2 AND distance_m IS NOT NULL
       AND ABS(distance_m - $3) / GREATEST(distance_m, $3) < 0.05`,
    [name, date, distance_m]
  );
  return r.rows.length > 0;
}

export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workouts (
      id            SERIAL PRIMARY KEY,
      name          TEXT    NOT NULL,
      file_name     TEXT    NOT NULL,
      file_type     TEXT    NOT NULL,
      workout_date  TEXT    NOT NULL,
      duration_s    INTEGER,
      distance_m    REAL,
      avg_speed_ms  REAL,
      max_speed_ms  REAL,
      avg_hr        INTEGER,
      max_hr        INTEGER,
      calories      INTEGER,
      location      TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS races (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      race_date   TEXT NOT NULL,
      location    TEXT,
      logo        TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS races_name_unique ON races (LOWER(name));

    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS mile_splits JSONB;
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS mile_bearings JSONB;
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS avg_temp_c REAL;
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS map_image_url TEXT;
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS map_svg TEXT;
    ALTER TABLE races ADD COLUMN IF NOT EXISTS results JSONB;

    CREATE TABLE IF NOT EXISTS strava_tokens (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL UNIQUE,
      athlete_id    BIGINT NOT NULL UNIQUE,
      access_token  TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at    BIGINT NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    UPDATE workouts SET workout_date = REPLACE(workout_date, '2024', '2026') WHERE workout_date LIKE '%2024%';
    UPDATE workouts SET name = 'Zach' WHERE name = 'Zack';
    UPDATE workouts SET workout_date = REPLACE(workout_date, '2026-01-09', '2026-03-07') WHERE workout_date LIKE '%2026-01-09%';

    INSERT INTO races (name, race_date, location, logo)
    SELECT 'Catalina Classic', '2026-08-30', 'Catalina Island to Manhattan Beach', '/logos/catalina-classic.jpg'
    WHERE NOT EXISTS (SELECT 1 FROM races WHERE LOWER(name) = 'catalina classic');

    INSERT INTO races (name, race_date, location, logo)
    SELECT 'The Loop', '2026-05-16', null, '/logos/the-loop.jpg'
    WHERE NOT EXISTS (SELECT 1 FROM races WHERE LOWER(name) = 'the loop');

    INSERT INTO races (name, race_date, location, logo)
    SELECT 'Malibu Downwinder', '2026-04-25', null, '/logos/malibu-downwinder.png'
    WHERE NOT EXISTS (SELECT 1 FROM races WHERE LOWER(name) = 'malibu downwinder');

    INSERT INTO races (name, race_date, location, logo)
    SELECT 'South Bay Paddle', '2026-06-20', null, '/logos/south-bay-paddle.jpg'
    WHERE NOT EXISTS (SELECT 1 FROM races WHERE LOWER(name) = 'south bay paddle');

    UPDATE races SET race_date = '2026-06-20' WHERE LOWER(name) = 'south bay paddle';

    INSERT INTO races (name, race_date, location, logo)
    SELECT 'R10 Paddleboard Race', '2026-06-06', null, '/logos/r10-race.jpg'
    WHERE NOT EXISTS (SELECT 1 FROM races WHERE LOWER(name) = 'r10 paddleboard race');

    INSERT INTO races (name, race_date, location, logo)
    SELECT 'Adler Paddler', '2026-03-15', null, '/logos/adler-paddler.png'
    WHERE NOT EXISTS (SELECT 1 FROM races WHERE LOWER(name) = 'adler paddler');

    UPDATE races SET logo = '/logos/adler-paddler.png' WHERE LOWER(name) = 'adler paddler' AND (logo IS NULL OR logo = '');

    UPDATE races SET results = '[
      {"place": 1,  "name": "Zach Jirkovsky",  "time": "50:55"},
      {"place": 2,  "name": "Andrew Mathison",  "time": "51:19"},
      {"place": 3,  "name": "DJ Nurre",          "time": "52:42"},
      {"place": 4,  "name": "Brent Blackman",    "time": "53:09"},
      {"place": 5,  "name": "Dave Price",         "time": "55:16"},
      {"place": 6,  "name": "Sean Reseigh",       "time": "55:45"},
      {"place": 7,  "name": "Jacob Melendez",     "time": "56:09"},
      {"place": 8,  "name": "Alex Merrill",       "time": "56:23"},
      {"place": 9,  "name": "Brian Bayer",        "time": "57:07"},
      {"place": 10, "name": "Gavin McNeal",       "time": "58:49"},
      {"place": 11, "name": "Casey Annis",        "time": "59:04"},
      {"place": 12, "name": "Matthew Ruane",      "time": "1:01:28"},
      {"place": 13, "name": "Brian Gregoire",     "time": "1:09:01"},
      {"place": 14, "name": "Beck Maxwell",       "time": "1:10:03"},
      {"place": 15, "name": "Jeff Hooykaas",      "time": "1:12:57"},
      {"place": 16, "name": "Jon Wood",           "time": "1:06:18"}
    ]'::jsonb
    WHERE LOWER(name) = 'adler paddler' AND results IS NULL;

    DELETE FROM races WHERE LOWER(name) LIKE '%lifeguard%' AND LOWER(name) != 'the lifeguard lap';

    INSERT INTO races (name, race_date, location, logo)
    SELECT 'The Lifeguard Lap', '2026-04-11', 'Port San Luis, California', '/logos/lifeguard-lap.png'
    WHERE NOT EXISTS (SELECT 1 FROM races WHERE LOWER(name) = 'the lifeguard lap');

    UPDATE races SET logo = '/logos/lifeguard-lap.png', race_date = '2026-04-11', location = 'Port San Luis, California'
    WHERE LOWER(name) = 'the lifeguard lap';

    INSERT INTO races (name, race_date, location, logo)
    SELECT 'El Morro Classic', '2026-05-30', null, '/logos/el-morro-classic.png'
    WHERE NOT EXISTS (SELECT 1 FROM races WHERE LOWER(name) = 'el morro classic');

    UPDATE races SET logo = '/logos/el-morro-classic.png' WHERE LOWER(name) = 'el morro classic' AND (logo IS NULL OR logo = '');

    INSERT INTO races (name, race_date, location, logo)
    SELECT 'Rock 2 Rock Paddleboard Race', '2026-07-12', 'Two Harbors, Catalina Island to Cabrillo State Beach, San Pedro, CA', '/logos/rock2rock.png'
    WHERE NOT EXISTS (SELECT 1 FROM races WHERE LOWER(name) = 'rock 2 rock paddleboard race');
  `);
}
