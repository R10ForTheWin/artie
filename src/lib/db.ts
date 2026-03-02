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
  `);
}
