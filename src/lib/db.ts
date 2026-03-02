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

    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS mile_splits JSONB;

    INSERT INTO races (name, race_date, location, logo)
    SELECT 'Catalina Classic', '2026-08-30', 'Catalina Island to Manhattan Beach', '/logos/catalina-classic.jpg'
    WHERE NOT EXISTS (SELECT 1 FROM races WHERE name = 'Catalina Classic');

    INSERT INTO races (name, race_date, location, logo)
    SELECT 'The Loop', '2026-05-16', null, '/logos/the-loop.jpg'
    WHERE NOT EXISTS (SELECT 1 FROM races WHERE name = 'The Loop');

    INSERT INTO races (name, race_date, location, logo)
    SELECT 'Malibu Downwinder', '2026-04-25', null, '/logos/malibu-downwinder.png'
    WHERE NOT EXISTS (SELECT 1 FROM races WHERE name = 'Malibu Downwinder');

    INSERT INTO races (name, race_date, location, logo)
    SELECT 'South Bay Paddle', '2026-06-09', null, '/logos/south-bay-paddle.jpg'
    WHERE NOT EXISTS (SELECT 1 FROM races WHERE name = 'South Bay Paddle');
  `);
}
