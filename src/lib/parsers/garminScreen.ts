import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const SCREEN_KINDS = ['overview', 'stats', 'laps', 'charts', 'share', 'other'] as const;
export type ScreenKind = (typeof SCREEN_KINDS)[number];

/** Everything any Garmin Connect activity tab can show. Null when not on screen. */
export interface ScreenFields {
  workout_date: string | null;
  start_time: string | null;
  title: string | null;
  sport: string | null;
  distance_m: number | null;
  duration_s: number | null;
  moving_time_s: number | null;
  avg_speed_ms: number | null;
  max_speed_ms: number | null;
  best_pace_s: number | null;
  calories: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  total_strokes: number | null;
  avg_stroke_rate: number | null;
  max_stroke_rate: number | null;
  distance_per_stroke_ft: number | null;
  mile_splits: number[] | null;
  training_effect_aerobic: number | null;
  training_effect_anaerobic: number | null;
  weather_temp_f: number | null;
}

export interface ScreenRead {
  kind: ScreenKind;
  fields: ScreenFields;
}

const EMPTY: ScreenFields = {
  workout_date: null, start_time: null, title: null, sport: null,
  distance_m: null, duration_s: null, moving_time_s: null,
  avg_speed_ms: null, max_speed_ms: null, best_pace_s: null, calories: null,
  avg_hr: null, max_hr: null,
  total_strokes: null, avg_stroke_rate: null, max_stroke_rate: null, distance_per_stroke_ft: null,
  mile_splits: null, training_effect_aerobic: null, training_effect_anaerobic: null, weather_temp_f: null,
};

/** Screenshots are shrunk before reading — a phone capture is far bigger than the model needs. */
export async function prepareImage(buffer: Buffer, maxEdge = 1600, quality = 85): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  return sharp(buffer)
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/**
 * One call works out which tab a screenshot shows and reads every number on it,
 * so people can pick all their screenshots at once in any order.
 */
export async function readGarminScreen(buffer: Buffer): Promise<ScreenRead> {
  const jpeg = await prepareImage(buffer);
  const today = new Date().toISOString().slice(0, 10);

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpeg.toString('base64') } },
          {
            type: 'text',
            text: `This is a screenshot from the Garmin Connect phone app, or a Garmin share card.

First decide "kind":
- "overview": the Overview tab — a map, the activity date and time, title, and a few headline numbers
- "stats": the Stats tab — a long list of rows grouped under headings like Summary, Strokes, Pace, Speed, Heart Rate, Timing
- "laps": the Laps tab — a table of laps with time, distance and pace
- "charts": the Charts tab — graphs such as pace or heart rate, and Training Effect
- "share": a Garmin share card image (big distance/time on a picture)
- "other": anything else

Then copy each value EXACTLY as it is displayed — do not convert units or do any arithmetic. Numbers are plain JSON numbers (no commas); times and paces are strings as shown. Return ONLY this JSON object, using null for anything not on screen:
{
  "kind": "...",
  "date": "YYYY-MM-DD" (today is ${today}; a date shown without a year is the most recent such date on or before today),
  "start_time": "7:11 AM",
  "title": "Redondo Beach Paddleboarding",
  "sport": "Stand Up Paddleboarding",
  "distance": { "value": 10.41, "unit": "mi" },
  "total_time": "2:04:26",
  "moving_time": "2:03:52",
  "avg_speed": { "value": 5.0, "unit": "mph" },
  "max_speed": { "value": 6.1, "unit": "mph" },
  "best_pace": { "value": "9:48", "unit": "/mi" },
  "calories": 1347,
  "avg_hr": 142, "max_hr": 171,
  "total_strokes": 1609, "avg_stroke_rate": 33, "max_stroke_rate": 53,
  "distance_per_stroke": { "value": 15.49, "unit": "ft" },
  "laps": [ { "time": "11:30.6", "distance": 1.00 } ],
  "training_effect_aerobic": 0.2, "training_effect_anaerobic": 0.0,
  "weather_temp_f": 70
}
The example values above only show the format. No text outside the JSON.`,
          },
        ],
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
  const body = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const json = JSON.parse(body || '{}');

  const kind: ScreenKind = (SCREEN_KINDS as readonly string[]).includes(json.kind) ? json.kind : 'other';
  const round = (v: number | null) => (v === null ? null : Math.round(v));

  // Laps: keep whole-mile laps only; a pool swim's 100yd laps aren't mile splits
  const laps = Array.isArray(json.laps) ? json.laps : [];
  const splits = laps
    .filter((l: { distance?: unknown }) => typeof l?.distance === 'number' && Math.abs(l.distance - 1) < 0.005)
    .map((l: { time?: unknown }) => clock(l.time))
    .filter((t: number | null): t is number => t !== null && t > 0)
    .map((t: number) => Math.round(t));

  return {
    kind,
    fields: {
      ...EMPTY,
      workout_date: /^\d{4}-\d{2}-\d{2}$/.test(json.date ?? '') ? json.date : null,
      start_time: str(json.start_time),
      title: str(json.title),
      sport: str(json.sport),
      distance_m: toMeters(json.distance),
      duration_s: round(clock(json.total_time)),
      moving_time_s: round(clock(json.moving_time)),
      avg_speed_ms: toMs(json.avg_speed),
      max_speed_ms: toMs(json.max_speed),
      best_pace_s: round(toPacePerMile(json.best_pace)),
      calories: round(num(json.calories)),
      avg_hr: num(json.avg_hr),
      max_hr: num(json.max_hr),
      total_strokes: round(num(json.total_strokes)),
      avg_stroke_rate: num(json.avg_stroke_rate),
      max_stroke_rate: num(json.max_stroke_rate),
      distance_per_stroke_ft: toFeet(json.distance_per_stroke),
      mile_splits: splits.length ? splits : null,
      training_effect_aerobic: num(json.training_effect_aerobic),
      training_effect_anaerobic: num(json.training_effect_anaerobic),
      weather_temp_f: num(json.weather_temp_f),
    },
  };
}

type Measure = { value?: unknown; unit?: unknown } | null | undefined;
const unitOf = (m: Measure) => (typeof m?.unit === 'string' ? m.unit.toLowerCase().replace(/\s/g, '') : '');

/** "2:04:26" → 7466, "11:30.6" → 690.6 */
function clock(v: unknown): number | null {
  if (typeof v !== 'string' || !/^\d+(:\d{1,2})+(\.\d+)?$/.test(v.trim())) return null;
  return v.trim().split(':').reduce((acc, part) => acc * 60 + parseFloat(part), 0);
}

function toMeters(m: Measure): number | null {
  const v = num(m?.value);
  if (v === null) return null;
  const u = unitOf(m);
  if (u.startsWith('mi')) return v * 1609.344;
  if (u.startsWith('yd') || u.startsWith('yard')) return v * 0.9144;
  if (u.startsWith('km')) return v * 1000;
  if (u === 'm' || u.startsWith('meter') || u.startsWith('metre')) return v;
  return null;
}

function toMs(m: Measure): number | null {
  const v = num(m?.value);
  if (v === null) return null;
  const u = unitOf(m);
  if (u.includes('mph') || u.includes('mi/h')) return v * 0.44704;
  if (u.includes('km/h') || u.includes('kph')) return v / 3.6;
  if (u.includes('kn')) return v * 0.514444;
  return null;
}

/** Any pace shown (per mile, per km, per 100 yd/m) as seconds per mile. */
function toPacePerMile(m: Measure): number | null {
  const s = clock(typeof m?.value === 'string' ? m.value : null);
  if (s === null) return null;
  const u = unitOf(m);
  if (u.includes('100yd') || u.includes('100y')) return s * (1609.344 / 91.44);
  if (u.includes('100m')) return s * (1609.344 / 100);
  if (u.includes('km')) return s * 1.609344;
  return s; // per mile
}

function toFeet(m: Measure): number | null {
  const v = num(m?.value);
  if (v === null) return null;
  const u = unitOf(m);
  if (u.startsWith('ft') || u.startsWith('feet')) return v;
  if (u === 'm' || u.startsWith('meter') || u.startsWith('metre')) return v * 3.28084;
  if (u.startsWith('yd')) return v * 3;
  return null;
}
