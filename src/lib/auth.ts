/**
 * PIN sign-in for ARTIE.
 *
 * Sessions are a signed cookie rather than server state, so middleware can check
 * them without a database round trip. Signing uses Web Crypto (HMAC-SHA256) so
 * the same code runs in Edge middleware and in Node route handlers; PIN hashing
 * uses node:crypto scrypt and therefore only ever runs in a route handler.
 *
 * With AUTH_SECRET unset the whole thing stays off and ARTIE behaves as it
 * always has — better than bricking the app the moment this deploys.
 */

export const SESSION_COOKIE = 'artie_session';
/** Browsers cap cookie lifetimes anyway (Chrome at 400 days); refreshed on each visit. */
export const SESSION_MAX_AGE = 400 * 24 * 60 * 60;

export const authEnabled = () => Boolean(process.env.AUTH_SECRET);

const enc = new TextEncoder();

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Cookie value: "<name>.<issued-at>.<signature>" */
export async function signSession(name: string, secret: string): Promise<string> {
  const payload = `${encodeURIComponent(name)}.${Date.now()}`;
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(payload));
  return `${payload}.${toHex(sig)}`;
}

/** Returns the signed-in name, or null if the cookie is missing, altered or stale. */
export async function verifySession(cookie: string | undefined, secret: string): Promise<string | null> {
  if (!cookie) return null;
  const parts = cookie.split('.');
  if (parts.length !== 3) return null;
  const [rawName, issued, sig] = parts;
  const payload = `${rawName}.${issued}`;
  const ok = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret),
    Uint8Array.from(sig.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? []),
    enc.encode(payload)
  );
  if (!ok) return null;
  const age = (Date.now() - Number(issued)) / 1000;
  if (!Number.isFinite(age) || age > SESSION_MAX_AGE) return null;
  return decodeURIComponent(rawName);
}

/** A person's display name, trimmed and length-capped — also the primary key. */
export function normaliseName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 24) return null;
  if (!/^[\p{L}][\p{L}\p{M}'’. -]*$/u.test(name)) return null;
  return name;
}

export function isValidPin(raw: unknown): raw is string {
  return typeof raw === 'string' && /^\d{4,8}$/.test(raw);
}
