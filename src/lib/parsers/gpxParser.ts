import { XMLParser } from 'fast-xml-parser';
import { ParsedWorkout } from './index';

function fmtPace(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function generateRouteSvg(lats: number[], lons: number[], mileLats: number[], mileLons: number[], mileSplits: number[], meta: { date: string; distanceMi: number; location?: string | null }): string {
  if (lats.length < 2) return '';
  // Downsample to max 300 points
  const step = Math.max(1, Math.floor(lats.length / 300));
  const sLats = lats.filter((_, i) => i % step === 0);
  const sLons = lons.filter((_, i) => i % step === 0);

  const minLat = Math.min(...sLats), maxLat = Math.max(...sLats);
  const minLon = Math.min(...sLons), maxLon = Math.max(...sLons);
  const latRange = maxLat - minLat || 0.0001;
  const lonRange = maxLon - minLon || 0.0001;

  // Correct for longitude compression at this latitude
  const lonScale = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const W = 400, H = 250, pad = 20;
  const scale = Math.min((W - pad * 2) / (lonRange * lonScale), (H - pad * 2) / latRange);

  // Center the route in the canvas
  const routeW = lonRange * lonScale * scale;
  const routeH = latRange * scale;
  const ox = (W - routeW) / 2;
  const oy = (H - routeH) / 2;

  const toXY = (lat: number, lon: number) => ({
    x: parseFloat((ox + (lon - minLon) * lonScale * scale).toFixed(1)),
    y: parseFloat((H - oy - (lat - minLat) * scale).toFixed(1)),
  });

  const coords = sLats.map((lat, i) => toXY(lat, sLons[i]));
  const points = coords.map(p => `${p.x},${p.y}`).join(' ');
  const start = coords[0];
  const end = coords[coords.length - 1];

  // Build XY positions for each mile marker, with start prepended
  const mileXY = mileLats.map((lat, i) => toXY(lat, mileLons[i]));
  const allPoints = [start, ...mileXY]; // start + each mile boundary

  // R10 buoy marker (hardcoded) — show if within map bounds
  const R10_LAT = 33.77335, R10_LON = -118.44535;
  const r10InBounds = R10_LAT >= minLat && R10_LAT <= maxLat && R10_LON >= minLon && R10_LON <= maxLon;
  const r10Marker = r10InBounds ? (() => {
    const { x, y } = toXY(R10_LAT, R10_LON);
    return `
      <ellipse cx="${x}" cy="${y + 2}" rx="9" ry="4" fill="#C4532A"/>
      <line x1="${x - 5}" y1="${y - 1}" x2="${x - 3}" y2="${y - 16}" stroke="#C4532A" stroke-width="1.5"/>
      <line x1="${x + 5}" y1="${y - 1}" x2="${x + 3}" y2="${y - 16}" stroke="#C4532A" stroke-width="1.5"/>
      <line x1="${x - 4}" y1="${y - 7}" x2="${x + 4}" y2="${y - 11}" stroke="#C4532A" stroke-width="1"/>
      <line x1="${x - 4}" y1="${y - 11}" x2="${x + 4}" y2="${y - 7}" stroke="#C4532A" stroke-width="1"/>
      <rect x="${x - 8}" y="${y - 28}" width="16" height="13" rx="1" fill="#C4532A" stroke="white" stroke-width="1"/>
      <text x="${x}" y="${y - 19}" text-anchor="middle" font-size="7" font-family="sans-serif" font-weight="bold" fill="white">R10</text>
    `;
  })() : '';

  // Mile dots: white circle with bold navy number inside
  const mileDots = mileXY.map(({ x, y }, i) =>
    `<circle cx="${x}" cy="${y}" r="9" fill="white" stroke="#1B2A4A" stroke-width="2"/>
     <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="9" font-family="sans-serif" font-weight="bold" fill="#1B2A4A">${i + 1}</text>`
  ).join('');

  // Pace labels: gold pill badges midway between consecutive markers
  const paceLabels = mileSplits.map((split, i) => {
    const p1 = allPoints[i];
    const p2 = allPoints[i + 1];
    if (!p1 || !p2) return '';
    const mx = parseFloat(((p1.x + p2.x) / 2).toFixed(1));
    const my = parseFloat(((p1.y + p2.y) / 2).toFixed(1));
    const label = fmtPace(split);
    const pw = 30, ph = 14, pr = 4;
    return `<rect x="${mx - pw / 2}" y="${my - ph - 6}" width="${pw}" height="${ph}" rx="${pr}" fill="#1B2A4A"/>
            <text x="${mx}" y="${my - 6 - ph / 2 + 5}" text-anchor="middle" font-size="8" font-family="sans-serif" font-weight="bold" fill="white">${label}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d8eaf5"/>
        <stop offset="100%" stop-color="#b8d4e8"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#water)"/>
    <polyline points="${points}" fill="none" stroke="#C9922A" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity="0.95"/>
    ${paceLabels}
    ${mileDots}
    ${r10Marker}
    <circle cx="28" cy="${H - 28}" r="18" fill="white" fill-opacity="0.85" stroke="#1B2A4A" stroke-width="1" stroke-opacity="0.3"/>
    <polygon points="28,${H - 44} 31,${H - 32} 28,${H - 35} 25,${H - 32}" fill="#1B2A4A"/>
    <polygon points="28,${H - 12} 31,${H - 24} 28,${H - 21} 25,${H - 24}" fill="#1B2A4A" opacity="0.3"/>
    <text x="28" y="${H - 46}" text-anchor="middle" font-size="7" font-family="sans-serif" font-weight="bold" fill="#1B2A4A">N</text>
    <circle cx="${start.x}" cy="${start.y}" r="7" fill="#1B2A4A"/>
    <circle cx="${start.x}" cy="${start.y}" r="3" fill="white"/>
    <circle cx="${end.x}" cy="${end.y}" r="7" fill="#C4532A"/>
    <circle cx="${end.x}" cy="${end.y}" r="3" fill="white"/>
    <rect x="0" y="${H - 24}" width="${W}" height="24" fill="#1B2A4A" fill-opacity="0.75"/>
    <text x="10" y="${H - 9}" font-size="9" font-family="sans-serif" font-weight="bold" fill="white">${meta.date}${meta.location ? ` · ${meta.location}` : ''}</text>
    <text x="${W - 10}" y="${H - 9}" text-anchor="end" font-size="9" font-family="sans-serif" font-weight="bold" fill="#C9922A">${meta.distanceMi.toFixed(2)} mi</text>
  </svg>`;
}

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
  const mileLats: number[] = [];
  const mileLons: number[] = [];
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

    // Mile splits — record time and coordinates for each completed full mile
    while (distance_m - lastMileDistance >= MILE_M) {
      lastMileDistance += MILE_M;
      const splitTime = Math.round((times[i] - lastMileTime) / 1000);
      mile_splits.push(splitTime);
      mileLats.push(lats[i]);
      mileLons.push(lons[i]);
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

  const workout_date = times[0] ? new Date(times[0]).toISOString() : new Date().toISOString();
  const [year, month, day] = workout_date.split('T')[0].split('-').map(Number);
  const dateStr = new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return Promise.resolve({
    workout_date,
    duration_s,
    distance_m,
    avg_speed_ms,
    max_speed_ms: max_speed_ms > 0 ? max_speed_ms : null,
    avg_hr,
    max_hr,
    calories: null,
    mile_splits: mile_splits.length > 0 ? mile_splits : null,
    avg_temp_c,
    map_svg: generateRouteSvg(lats, lons, mileLats, mileLons, mile_splits, {
      date: dateStr,
      distanceMi: distance_m * 0.000621371,
    }),
  });
}

export function injectMapLocation(svg: string, location: string): string {
  return svg.replace(/(<text[^>]*font-weight="bold" fill="white">)([^<]*)(<\/text>\s*<text[^>]*text-anchor="end")/,
    `$1${location ? `${location} · ` : ''}$2$3`
  );
}
