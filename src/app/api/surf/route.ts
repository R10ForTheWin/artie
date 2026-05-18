import { NextResponse } from 'next/server';

export const revalidate = 3600;

// Topaz Street, Manhattan Beach, CA
const LAT = 33.886;
const LON = -118.406;

interface WindHour {
  hour: number;      // 6, 7, 8, 9, 10, 11
  speedMph: number;
  direction: string; // cardinal e.g. "SW"
}

interface SurfSlot {
  date: string;
  waveHeightFt: number;
  windState: string;  // from surf-forecast (qualitative)
  windHours: WindHour[]; // hourly 6–11am from Open-Meteo
}

export interface SurfResult {
  morning: SurfSlot | null;
  morningLabel: string;
  error?: string;
}

function mToFt(m: number) { return Math.round(m * 3.281 * 2) / 2; }
function kphToMph(kph: number) { return Math.round(kph * 0.621); }

function degToCardinal(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

export async function GET() {
  try {
    const ptDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    const ptHour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false }));

    // --- surf-forecast.com for wave height + wind state ---
    const surfRes = await fetch(
      'https://www.surf-forecast.com/breaks/Topaz-Street/forecasts/latest/six_day',
      { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }, next: { revalidate: 3600 } }
    );
    if (!surfRes.ok) throw new Error(`surf-forecast fetch failed: ${surfRes.status}`);
    const html = await surfRes.text();

    const timeLabelRe = /forecast-table__time[^>]*><span[^>]*>([^<]+)</g;
    const timePeriods: string[] = [];
    let m;
    while ((m = timeLabelRe.exec(html)) !== null) timePeriods.push(m[1].trim());

    const dayCellRe = /colspan="(\d+)"[^>]*data-date="(\d{4}-\d{2}-\d{2})"/g;
    const dayMap: { date: string; period: string }[] = [];
    while ((m = dayCellRe.exec(html)) !== null) {
      const span = parseInt(m[1]);
      const date = m[2];
      for (let i = 0; i < span; i++) dayMap.push({ date, period: timePeriods[dayMap.length] ?? '' });
    }

    const heightRe = /data-height="([^"]+)"/g;
    const heights: number[] = [];
    while ((m = heightRe.exec(html)) !== null) heights.push(parseFloat(m[1]));

    const wsRe = /wind-state wind-state--([^\s"<]+)/g;
    const allWs: string[] = [];
    while ((m = wsRe.exec(html)) !== null) allWs.push(m[1]);
    const windStates = allWs.slice(6); // skip 6 tooltip definitions

    const amCols = dayMap.map((d, i) => ({ ...d, idx: i })).filter(d => d.period === 'AM');
    const target = amCols.find(c => c.date === ptDateStr && ptHour < 11)
      ?? amCols.find(c => c.date > ptDateStr);

    if (!target) return NextResponse.json({ morning: null, morningLabel: '', error: 'No upcoming AM data' });

    const waveHeightFt = mToFt(heights[target.idx] ?? 0);
    const windState = windStates[target.idx] ?? '';
    const morningLabel = target.date === ptDateStr ? 'Today' : 'Tomorrow';

    // --- Open-Meteo for hourly wind 6–11am ---
    const meteoRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=mph&timezone=America%2FLos_Angeles&forecast_days=3`,
      { next: { revalidate: 3600 } }
    );
    if (!meteoRes.ok) throw new Error(`open-meteo fetch failed: ${meteoRes.status}`);
    const meteo = await meteoRes.json();

    const times: string[] = meteo.hourly.time;
    const speeds: number[] = meteo.hourly.wind_speed_10m;
    const dirs: number[] = meteo.hourly.wind_direction_10m;

    const windHours: WindHour[] = [];
    for (let hr = 6; hr <= 11; hr++) {
      const ts = `${target.date}T${String(hr).padStart(2, '0')}:00`;
      const idx = times.indexOf(ts);
      if (idx >= 0) {
        windHours.push({
          hour: hr,
          speedMph: Math.round(speeds[idx]),
          direction: degToCardinal(dirs[idx]),
        });
      }
    }

    const morning: SurfSlot = { date: target.date, waveHeightFt, windState, windHours };
    return NextResponse.json({ morning, morningLabel } satisfies SurfResult);

  } catch (e) {
    return NextResponse.json({ morning: null, morningLabel: '', error: String(e) });
  }
}
