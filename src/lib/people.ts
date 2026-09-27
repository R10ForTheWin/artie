import { pool } from './db';

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
