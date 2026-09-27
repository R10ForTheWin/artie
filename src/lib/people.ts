import { pool } from './db';
import { TEAMMATES } from './teammates';

export interface Person {
  name: string;
  is_admin: boolean;
}

/** Whoever the app treats as admin. */
export const adminName = () => process.env.ADMIN_NAME?.trim() || 'DJ';

export async function getPerson(name: string): Promise<Person | null> {
  const { rows } = await pool.query('SELECT name FROM people WHERE LOWER(name) = LOWER($1)', [name]);
  if (!rows[0]) return null;
  return { ...rows[0], is_admin: rows[0].name === adminName() };
}

export async function listPeople(): Promise<Person[]> {
  const { rows } = await pool.query('SELECT name FROM people ORDER BY LOWER(name)');
  return rows.map((r: { name: string }) => ({ ...r, is_admin: r.name === adminName() }));
}

export async function createPerson(name: string, lastName: string): Promise<boolean> {
  const res = await pool.query(
    `INSERT INTO people (name, last_name) VALUES ($1, $2)
     ON CONFLICT (name) DO NOTHING RETURNING name`,
    [name, lastName]
  );
  return (res.rowCount ?? 0) > 0;
}

/** Anyone on the sign-in roster, falling back to the original hard-coded list. */
export async function isKnownPaddler(name: string): Promise<boolean> {
  if ((TEAMMATES as readonly string[]).includes(name)) return true;
  const { rows } = await pool.query('SELECT 1 FROM people WHERE LOWER(name) = LOWER($1)', [name]);
  return rows.length > 0;
}

/** Only a chest strap gives heart rate worth keeping; wrist readings are dropped. */
export async function usesHrMonitor(name: string): Promise<boolean> {
  const { rows } = await pool.query('SELECT uses_hr_monitor FROM people WHERE LOWER(name) = LOWER($1)', [name]);
  return rows[0]?.uses_hr_monitor === true;
}
