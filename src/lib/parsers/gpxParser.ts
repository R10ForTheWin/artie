import { XMLParser } from 'fast-xml-parser';
import { ParsedWorkout } from './index';

function fmtPace(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

const MILE_M = 1609.344;

function generateRouteSvg(lats: number[], lons: number[], cumDist: number[], mileLats: number[], mileLons: number[], mileSplits: number[], meta: { date: string; distanceMi: number; location?: string | null }): string {
  if (lats.length < 2) return '';
  // Downsample to max 300 points
  const step = Math.max(1, Math.floor(lats.length / 300));
  const sLats = lats.filter((_, i) => i % step === 0);
  const sLons = lons.filter((_, i) => i % step === 0);
  const sCumDist = cumDist.filter((_, i) => i % step === 0);

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

  const start = toXY(sLats[0], sLons[0]);
  const end = toXY(sLats[sLats.length - 1], sLons[sLons.length - 1]);

  // Build XY positions for each mile marker, with start prepended
  const mileXY = mileLats.map((lat, i) => toXY(lat, mileLons[i]));
  const allPoints = [start, ...mileXY]; // start + each mile boundary

  // Per-segment polylines — one per mile, plus a final partial segment
  const numSegments = mileLats.length + 1;
  const segmentPolylines = Array.from({ length: numSegments }, (_, seg) => {
    const segStartDist = seg * MILE_M;
    const segEndDist = (seg + 1) * MILE_M;
    const pts: { x: number; y: number }[] = [];
    pts.push(seg === 0 ? start : toXY(mileLats[seg - 1], mileLons[seg - 1]));
    for (let i = 0; i < sLats.length; i++) {
      if (sCumDist[i] > segStartDist && sCumDist[i] < segEndDist) {
        pts.push(toXY(sLats[i], sLons[i]));
      }
    }
    pts.push(seg < mileLats.length ? toXY(mileLats[seg], mileLons[seg]) : end);
    if (pts.length < 2) return '';
    return `<polyline id="segment-${seg + 1}" points="${pts.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#C9922A" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity="0.95"/>`;
  }).join('\n    ');

  // Topaz start sign (hardcoded) — show if within map bounds
  const TOPAZ_LAT = 33.83238, TOPAZ_LON = -118.39028;
  const topazInBounds = TOPAZ_LAT >= minLat - 0.01 && TOPAZ_LAT <= maxLat + 0.01 && TOPAZ_LON >= minLon - 0.01 && TOPAZ_LON <= maxLon + 0.01;
  const topazMarker = topazInBounds ? (() => {
    const { x, y } = toXY(TOPAZ_LAT, TOPAZ_LON);
    return `
      <line x1="${x}" y1="${y}" x2="${x}" y2="${y - 10}" stroke="#555" stroke-width="1.5"/>
      <rect x="${x - 22}" y="${y - 26}" width="44" height="16" rx="2" fill="#2E7D32"/>
      <rect x="${x - 20.5}" y="${y - 24.5}" width="41" height="13" rx="1" fill="none" stroke="white" stroke-width="0.75"/>
      <polygon points="${x - 17},${y - 14} ${x - 13},${y - 14} ${x - 15},${y - 21}" fill="white"/>
      <line x1="${x - 15}" y1="${y - 21}" x2="${x - 11.5}" y2="${y - 17}" stroke="white" stroke-width="0.75"/>
      <text x="${x + 4}" y="${y - 15}" text-anchor="middle" font-size="7" font-family="sans-serif" font-weight="bold" fill="white" letter-spacing="0.5">TOPAZ</text>
    `;
  })() : '';

  // Roundhouse Aquarium at Manhattan Beach Pier (hardcoded)
  const RH_LAT = 33.88433, RH_LON = -118.41393;
  const rhInBounds = RH_LAT >= minLat && RH_LAT <= maxLat && RH_LON >= minLon && RH_LON <= maxLon;
  const rhMarker = rhInBounds ? (() => {
    const { x, y } = toXY(RH_LAT, RH_LON);
    return `
      <line x1="${x - 12}" y1="${y - 2}" x2="${x}" y2="${y - 2}" stroke="#1B2A4A" stroke-width="1.5" opacity="0.6"/>
      <line x1="${x - 12}" y1="${y + 2}" x2="${x}" y2="${y + 2}" stroke="#1B2A4A" stroke-width="1.5" opacity="0.6"/>
      <circle cx="${x}" cy="${y}" r="7" fill="#5B8DB8" stroke="white" stroke-width="1.5"/>
      <text x="${x}" y="${y + 3}" text-anchor="middle" font-size="6" font-family="sans-serif" font-weight="bold" fill="white">RH</text>
      <polygon points="${x - 8},${y - 7} ${x},${y - 15} ${x + 8},${y - 7}" fill="#C4532A"/>
      <text x="${x}" y="${y - 18}" text-anchor="middle" font-size="7" font-family="sans-serif" font-weight="bold" fill="#1B2A4A">Roundhouse</text>
    `;
  })() : '';

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
    `<circle id="mile-${i + 1}" cx="${x}" cy="${y}" r="9" fill="white" stroke="#1B2A4A" stroke-width="2"/>
     <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="9" font-family="sans-serif" font-weight="bold" fill="#1B2A4A">${i + 1}</text>`
  ).join('');

  // Pace labels: offset perpendicular to each segment, alternating sides
  const paceLabels = mileSplits.map((split, i) => {
    const p1 = allPoints[i];
    const p2 = allPoints[i + 1];
    if (!p1 || !p2) return '';
    const mx = parseFloat(((p1.x + p2.x) / 2).toFixed(1));
    const my = parseFloat(((p1.y + p2.y) / 2).toFixed(1));
    const label = fmtPace(split);
    const pw = 30, ph = 14, pr = 4;
    // Perpendicular to segment direction
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const side = i % 2 === 0 ? 1 : -1;
    const dist = 44;
    const px = parseFloat((mx + nx * dist * side).toFixed(1));
    const py = parseFloat((my + ny * dist * side).toFixed(1));
    return `<line x1="${mx}" y1="${my}" x2="${px}" y2="${py}" stroke="#1B2A4A" stroke-width="0.8" opacity="0.5"/>
            <rect x="${px - pw / 2}" y="${py - ph / 2}" width="${pw}" height="${ph}" rx="${pr}" fill="#1B2A4A"/>
            <text x="${px}" y="${py + 4}" text-anchor="middle" font-size="8" font-family="sans-serif" font-weight="bold" fill="white">${label}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d8eaf5"/>
        <stop offset="100%" stop-color="#b8d4e8"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#water)"/>
    ${segmentPolylines}
    ${paceLabels}
    ${mileDots}
    ${r10Marker}
    ${rhMarker}
    ${topazMarker}
    <circle cx="28" cy="${H - 28}" r="18" fill="white" fill-opacity="0.85" stroke="#1B2A4A" stroke-width="1" stroke-opacity="0.3"/>
    <polygon points="28,${H - 44} 31,${H - 32} 28,${H - 35} 25,${H - 32}" fill="#1B2A4A"/>
    <polygon points="28,${H - 12} 31,${H - 24} 28,${H - 21} 25,${H - 24}" fill="#1B2A4A" opacity="0.3"/>
    <text x="28" y="${H - 46}" text-anchor="middle" font-size="7" font-family="sans-serif" font-weight="bold" fill="#1B2A4A">N</text>
    <circle cx="${end.x}" cy="${end.y}" r="7" fill="#1B2A4A"/>
    <circle cx="${end.x}" cy="${end.y}" r="3" fill="white"/>
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

  let distance_m = 0;
  let max_speed_ms = 0;
  const mile_splits: number[] = [];
  const mileLats: number[] = [];
  const mileLons: number[] = [];
  const cumDist: number[] = [0];
  let lastMileDistance = 0;
  let lastMileTime = times[0];

  for (let i = 1; i < points.length; i++) {
    const seg = haversine(lats[i - 1], lons[i - 1], lats[i], lons[i]);
    const dt = (times[i] - times[i - 1]) / 1000;
    distance_m += seg;
    cumDist.push(distance_m);

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
    map_svg: generateRouteSvg(lats, lons, cumDist, mileLats, mileLons, mile_splits, {
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
