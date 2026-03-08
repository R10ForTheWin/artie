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

  const MILE_M = 1609.344;
  let distance_m = 0;
  let max_speed_ms = 0;
  const mile_splits: number[] = [];
  let lastMileDistance = 0;
  let lastMileTime = times[0];

  for (let i = 1; i < points.length; i++) {
    const seg = haversine(lats[i - 1], lons[i - 1], lats[i], lons[i]);
    const dt = (times[i] - times[i - 1]) / 1000;
    distance_m += seg;

    // Max speed
    if (dt > 0) {
      const speed = seg / dt;
      if (speed > max_speed_ms) max_speed_ms = speed;
    }

    // Mile splits — record time for each completed full mile
    while (distance_m - lastMileDistance >= MILE_M) {
      lastMileDistance += MILE_M;
      const splitTime = Math.round((times[i] - lastMileTime) / 1000);
      mile_splits.push(splitTime);
      lastMileTime = times[i];
    }
  }

  const duration_s = times.length > 1 ? (times[times.length - 1] - times[0]) / 1000 : null;
  const avg_speed_ms = duration_s && distance_m ? distance_m / duration_s : null;

  function getExtension(p: Record<string, unknown>, key: string): unknown {
    const ext = p.extensions as Record<string, unknown> | undefined;
    const tpe = ext?.['gpxtpx:TrackPointExtension'] as Record<string, unknown> | undefined;
    return tpe?.[key];
  }

  const hrValues = points.map((p: Record<string, unknown>) => getExtension(p, 'gpxtpx:hr'))
    .filter(Boolean).map(Number);
  const tempValues = points.map((p: Record<string, unknown>) => getExtension(p, 'gpxtpx:atemp'))
    .filter((v) => v !== undefined && v !== null).map(Number);

  const avg_hr = hrValues.length
    ? Math.round(hrValues.reduce((a: number, b: number) => a + b, 0) / hrValues.length)
    : null;
  const max_hr = hrValues.length ? Math.max(...hrValues) : null;
  const avg_temp_c = tempValues.length
    ? Math.round(tempValues.reduce((a: number, b: number) => a + b, 0) / tempValues.length * 10) / 10
    : null;

  return Promise.resolve({
    workout_date: times[0] ? new Date(times[0]).toISOString() : new Date().toISOString(),
    duration_s,
    distance_m,
    avg_speed_ms,
    max_speed_ms: max_speed_ms > 0 ? max_speed_ms : null,
    avg_hr,
    max_hr,
    calories: null,
    mile_splits: mile_splits.length > 0 ? mile_splits : null,
    avg_temp_c,
  });
}
