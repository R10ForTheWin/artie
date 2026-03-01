import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'artie.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workouts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS races (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      race_date   TEXT NOT NULL,
      location    TEXT,
      logo        TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `);
}
