import { XMLParser } from 'fast-xml-parser';
import { ParsedWorkout } from './index';

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function parseGpx(buffer: Buffer): Promise<ParsedWorkout> {
  const xml = buffer.toString('utf-8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
  });
  const doc = parser.parse(xml);

  const trk = doc?.gpx?.trk;
  const trkseg = trk?.trkseg;
  const raw = trkseg?.trkpt ?? [];
  const points = Array.isArray(raw) ? raw : [raw];

  if (points.length === 0) {
    return Promise.reject(new Error('No track points found in GPX file'));
  }

  const times = points.map((p: Record<string, unknown>) => new Date(p.time as string).getTime());
  const lats  = points.map((p: Record<string, unknown>) => parseFloat(String(p['@_lat'])));
  const lons  = points.map((p: Record<string, unknown>) => parseFloat(String(p['@_lon'])));

  let distance_m = 0;
  for (let i = 1; i < points.length; i++) {
    distance_m += haversine(lats[i - 1], lons[i - 1], lats[i], lons[i]);
  }

  const duration_s = times.length > 1 ? (times[times.length - 1] - times[0]) / 1000 : null;
  const avg_speed_ms = duration_s && distance_m ? distance_m / duration_s : null;

  const hrValues = points
    .map((p: Record<string, unknown>) => {
      const ext = p.extensions as Record<string, unknown> | undefined;
      const tpe = ext?.['gpxtpx:TrackPointExtension'] as Record<string, unknown> | undefined;
      return tpe?.['gpxtpx:hr'];
    })
    .filter(Boolean)
    .map(Number);

  const avg_hr = hrValues.length
    ? Math.round(hrValues.reduce((a: number, b: number) => a + b, 0) / hrValues.length)
    : null;
  const max_hr = hrValues.length ? Math.max(...hrValues) : null;

  return Promise.resolve({
    workout_date: times[0] ? new Date(times[0]).toISOString() : new Date().toISOString(),
    duration_s,
    distance_m,
    avg_speed_ms,
    max_speed_ms: null,
    avg_hr,
    max_hr,
    calories: null,
  });
}
