import { type Activity } from '../activity';

export interface GarminCsvRow {
  activity: Activity;
  sport: string;
  workout_date: string;
  title: string;
  location: string | null;
  /** Raw Distance cell, kept so the preview can show what the file actually said. */
  rawDistance: string;
  distance_m: number | null;
  duration_s: number | null;
  calories: number | null;
  avg_hr: number | null;
  max_hr: number | null;
}

/** Garmin activity types we track, mapped onto ARTIE activities. */
const SPORT_MAP: { match: RegExp; activity: Activity }[] = [
  { match: /pool swim|lap swim/i, activity: 'pool_swim' },
  { match: /open water|ocean swim|swim/i, activity: 'ocean_swim' },
  { match: /paddleboard|paddling|canoe|kayak|rowing/i, activity: 'paddle' },
];

/** Anything not in SPORT_MAP is skipped rather than silently filed as a paddle. */
export function sportToActivity(sport: string): Activity | null {
  return SPORT_MAP.find((s) => s.match.test(sport))?.activity ?? null;
}

export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const num = (v: string | undefined): number | null => {
  if (!v || v === '--' || v.trim() === '') return null;
  const n = parseFloat(v.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

const durationToSeconds = (v: string | undefined): number | null => {
  if (!v || v === '--') return null;
  const parts = v.split(':').map(Number);
  if (parts.some((p) => !Number.isFinite(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + Math.round(parts[2]);
  if (parts.length === 2) return parts[0] * 60 + Math.round(parts[1]);
  return null;
};

/** Garmin titles read like "Redondo Beach Prone Paddleboarding" — strip the sport off the end. */
function locationFromTitle(title: string): string | null {
  const m = title.match(/^(.*?)\s+(?:Prone\s+|Stand Up\s+|Open Water\s+|Pool\s+)?(?:Paddleboarding|Paddling|Swimming|Swim|Kayaking|Canoeing|Rowing)$/i);
  const loc = m?.[1]?.trim();
  return loc && loc.length > 1 ? loc : null;
}

const MILE_M = 1609.344;
const YARD_M = 0.9144;

export type SwimUnit = 'yards' | 'meters';

/**
 * Garmin exports distance in the account's display units, which differ by sport:
 * paddles come through in miles, swims in yards or metres depending on the
 * account setting. The caller picks the swim unit; paddles are always miles.
 */
function toMeters(raw: number, activity: Activity, swimUnit: SwimUnit): number {
  if (activity === 'paddle') return raw * MILE_M;
  return swimUnit === 'yards' ? raw * YARD_M : raw;
}

export function parseGarminCsv(text: string, swimUnit: SwimUnit = 'yards'): GarminCsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const col = (name: string) => header.indexOf(name);
  const iType = col('Activity Type');
  const iDate = col('Date');
  const iTitle = col('Title');
  const iDist = col('Distance');
  const iTime = col('Time');
  const iCal = col('Calories');
  const iAvgHr = col('Avg HR');
  const iMaxHr = col('Max HR');
  if (iType < 0 || iDate < 0) return [];

  const rows: GarminCsvRow[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const c = splitCsvLine(line);
    const sport = (c[iType] ?? '').trim();
    const activity = sportToActivity(sport);
    if (!activity) continue; // surfing, running, etc.

    const workout_date = (c[iDate] ?? '').trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(workout_date)) continue;

    const title = (c[iTitle] ?? '').trim();
    const rawDistance = (c[iDist] ?? '').trim();
    const dist = num(rawDistance);

    rows.push({
      activity,
      sport,
      workout_date,
      title,
      location: locationFromTitle(title),
      rawDistance,
      distance_m: dist !== null ? Math.round(toMeters(dist, activity, swimUnit) * 10) / 10 : null,
      duration_s: durationToSeconds(c[iTime]),
      calories: num(c[iCal]),
      // Garmin writes '--' when the strap was not worn; num() turns that into null
      avg_hr: num(c[iAvgHr]),
      max_hr: num(c[iMaxHr]),
    });
  }
  return rows;
}

/** Stable per-row id so an import can be repeated without creating duplicates. */
export function csvFileName(row: GarminCsvRow): string {
  const slug = (row.title || row.sport).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `garmin-${row.workout_date}-${slug}`.slice(0, 120);
}
