import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

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
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS avg_temp_c REAL;

    UPDATE workouts SET workout_date = REPLACE(workout_date, '2024', '2026') WHERE workout_date LIKE '%2024%';
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

    INSERT INTO races (name, race_date, location, logo)
    SELECT 'The Lifeguard Lap', '2026-04-11', 'Port San Luis, California', '/logos/lifeguard-lap.png'
    WHERE NOT EXISTS (SELECT 1 FROM races WHERE LOWER(name) = 'the lifeguard lap');

    UPDATE races SET logo = '/logos/lifeguard-lap.png' WHERE LOWER(name) = 'the lifeguard lap' AND (logo IS NULL OR logo = '');

    INSERT INTO races (name, race_date, location, logo)
    SELECT 'El Morro Classic', '2026-05-30', null, '/logos/el-morro-classic.png'
    WHERE NOT EXISTS (SELECT 1 FROM races WHERE LOWER(name) = 'el morro classic');

    UPDATE races SET logo = '/logos/el-morro-classic.png' WHERE LOWER(name) = 'el morro classic' AND (logo IS NULL OR logo = '');
  `);
}
