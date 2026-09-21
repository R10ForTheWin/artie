import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { pool } from './db';

/** node:crypto — route handlers only, never middleware. */

export interface Person {
  name: string;
  pin_hash: string | null;
  is_admin: boolean;
}

/** Whoever can reset other people's PINs. */
export const adminName = () => process.env.ADMIN_NAME?.trim() || 'DJ';

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(pin, salt, 64).toString('hex');
  return `scrypt$${salt}$${key}`;
}

function pinMatches(pin: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, salt, key] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !key) return false;
  const attempt = scryptSync(pin, salt, 64);
  const expected = Buffer.from(key, 'hex');
  if (attempt.length !== expected.length) return false;
  return timingSafeEqual(attempt, expected);
}

export async function getPerson(name: string): Promise<Person | null> {
  const { rows } = await pool.query('SELECT name, pin_hash FROM people WHERE LOWER(name) = LOWER($1)', [name]);
  if (!rows[0]) return null;
  return { ...rows[0], is_admin: rows[0].name === adminName() };
}

export async function listPeople(): Promise<Person[]> {
  const { rows } = await pool.query('SELECT name, pin_hash FROM people ORDER BY LOWER(name)');
  return rows.map((r: { name: string; pin_hash: string | null }) => ({ ...r, is_admin: r.name === adminName() }));
}

export async function createPerson(name: string, pin: string): Promise<boolean> {
  const res = await pool.query(
    `INSERT INTO people (name, pin_hash) VALUES ($1, $2)
     ON CONFLICT (name) DO NOTHING RETURNING name`,
    [name, hashPin(pin)]
  );
  return (res.rowCount ?? 0) > 0;
}

/** First sign-in for someone whose PIN has never been set, or was reset. */
export async function claimPin(name: string, pin: string): Promise<boolean> {
  const res = await pool.query(
    'UPDATE people SET pin_hash = $1 WHERE LOWER(name) = LOWER($2) AND pin_hash IS NULL RETURNING name',
    [hashPin(pin), name]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function checkPin(name: string, pin: string): Promise<boolean> {
  const person = await getPerson(name);
  return person ? pinMatches(pin, person.pin_hash) : false;
}

/** Clears the PIN so the next sign-in sets a new one. Admin action. */
export async function resetPin(name: string): Promise<boolean> {
  const res = await pool.query(
    'UPDATE people SET pin_hash = NULL WHERE LOWER(name) = LOWER($1) RETURNING name',
    [name]
  );
  return (res.rowCount ?? 0) > 0;
}

/** Someone changing their own PIN, which needs the current one. */
export async function changePin(name: string, currentPin: string, nextPin: string): Promise<boolean> {
  if (!(await checkPin(name, currentPin))) return false;
  const res = await pool.query('UPDATE people SET pin_hash = $1 WHERE LOWER(name) = LOWER($2) RETURNING name', [
    hashPin(nextPin),
    name,
  ]);
  return (res.rowCount ?? 0) > 0;
}
