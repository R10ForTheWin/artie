/**
 * Pulls the swim-practice tally out of Reggie (the SCAQ registration app).
 *
 * This is deliberately single-user: Reggie's tally key is an HMAC of one
 * swimmer's email, so it only ever returns DJ's practices. Other teammates have
 * no equivalent feed and import their swims from a Garmin CSV like everyone else.
 * When the env vars are unset the whole feature stays hidden rather than erroring.
 */

const YARD_M = 0.9144;

export interface ReggiePractice {
  id: number;
  name: string;
  date: string | null;
  yards: number;
  confirmed: boolean;
  is_over: boolean;
}

export interface ReggieConfig {
  url: string;
  key: string;
  athlete: string;
}

export function reggieConfig(): ReggieConfig | null {
  const url = process.env.REGGIE_URL?.replace(/\/$/, '');
  const key = process.env.REGGIE_TALLY_KEY;
  const athlete = process.env.REGGIE_ATHLETE || 'DJ';
  if (!url || !key) return null;
  return { url, key, athlete };
}

/** Completed practices with a yardage, newest first. */
export async function fetchReggiePractices(cfg: ReggieConfig): Promise<ReggiePractice[]> {
  const res = await fetch(`${cfg.url}/api/attendance?key=${encodeURIComponent(cfg.key)}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Reggie returned HTTP ${res.status}`);
  const body = await res.json();
  const entries: ReggiePractice[] = body?.entries ?? [];
  // A practice still to come is not a workout, and one with no yardage tells us nothing.
  return entries.filter((e) => e.is_over && e.date && (e.yards ?? 0) > 0);
}

export const yardsToMeters = (yards: number) => Math.round(yards * YARD_M * 10) / 10;

/** Class names look like "El Segundo: Saturday 1/02 at 10:00am" — keep the pool. */
export function poolFromClassName(name: string): string | null {
  const head = name.split(':')[0]?.trim();
  return head && head.length > 1 && head.length < 40 ? head : null;
}
