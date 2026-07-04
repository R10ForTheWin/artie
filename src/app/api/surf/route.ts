import { NextResponse } from 'next/server';

export const revalidate = 1800;

// Topaz Street, Manhattan Beach, CA
const LAT = 33.886;
const LON = -118.406;

// Coast faces ~270° (west). Offshore wind = coming FROM the east (90°).
function computeWindState(avgSpeedMph: number, avgDirDeg: number): string {
  if (avgSpeedMph < 4) return 'glassy';
  const raw = Math.abs(avgDirDeg - 90);
  const angle = raw > 180 ? 360 - raw : raw; // 0=offshore, 180=onshore
  if (angle < 30)  return 'off';
  if (angle < 60)  return 'cross-off';
  if (angle < 120) return 'cross';
  if (angle < 150) return 'cross-on';
  return 'on';
}

function mToFt(m: number) { return Math.round(m * 3.281 * 2) / 2; }

function degToCardinal(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

interface WindHour { hour: number; speedMph: number; direction: string; }

interface SurfSlot {
  date: string;
  waveHeightFt: number;
  windState: string;
  windHours: WindHour[];
}

export interface SurfResult {
  morning: SurfSlot | null;
  morningLabel: string;
  error?: string;
}

// Parse NDBC realtime text → most recent valid WVHT reading (metres)
function parseNdbcWaveHeight(text: string): number | null {
  const lines = text.split('\n').filter(l => !l.startsWith('#') && l.trim());
  for (const line of lines) {
    const cols = line.trim().split(/\s+/);
    const wvht = cols[8];
    if (wvht && wvht !== 'MM') return parseFloat(wvht);
  }
  return null;
}

export async function GET() {
  try {
    const nowPT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const ptHour = nowPT.getHours();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayStr = fmt(nowPT);
    const tomorrowPT = new Date(nowPT); tomorrowPT.setDate(tomorrowPT.getDate() + 1);
    const tomorrowStr = fmt(tomorrowPT);

    const targetDate = ptHour < 11 ? todayStr : tomorrowStr;
    const morningLabel = targetDate === todayStr ? 'Today' : 'Tomorrow';

    // --- NDBC buoy 46222 for wave height (known to work from Railway) ---
    const ndbcRes = await fetch('https://www.ndbc.noaa.gov/data/realtime2/46222.txt', {
      next: { revalidate: 1800 },
    });
    if (!ndbcRes.ok) throw new Error(`NDBC fetch failed: ${ndbcRes.status}`);
    const ndbcText = await ndbcRes.text();
    const waveM = parseNdbcWaveHeight(ndbcText);
    if (waveM === null) throw new Error('No wave height data from NDBC');

    // --- Open-Meteo for wind (optional — graceful fallback if blocked) ---
    let windHours: WindHour[] = [];
    let windStateStr = '';
    try {
      const meteoRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=mph&timezone=America%2FLos_Angeles&forecast_days=3`,
        { next: { revalidate: 1800 } }
      );
      if (meteoRes.ok) {
        const meteo = await meteoRes.json();
        const times: string[] = meteo.hourly.time;
        const speeds: number[] = meteo.hourly.wind_speed_10m;
        const dirs: number[] = meteo.hourly.wind_direction_10m;

        const morningSpeeds: number[] = [];
        const morningDirs: number[] = [];
        for (let hr = 6; hr <= 11; hr++) {
          const ts = `${targetDate}T${String(hr).padStart(2, '0')}:00`;
          const i = times.indexOf(ts);
          if (i >= 0) {
            windHours.push({ hour: hr, speedMph: Math.round(speeds[i]), direction: degToCardinal(dirs[i]) });
            morningSpeeds.push(speeds[i]);
            morningDirs.push(dirs[i]);
          }
        }
        if (morningSpeeds.length > 0) {
          const avgSpeed = morningSpeeds.reduce((a, b) => a + b, 0) / morningSpeeds.length;
          const avgDir = morningDirs.reduce((a, b) => a + b, 0) / morningDirs.length;
          windStateStr = computeWindState(avgSpeed, avgDir);
        }
      }
    } catch {
      // wind data unavailable — wave height still shown
    }

    const morning: SurfSlot = {
      date: targetDate,
      waveHeightFt: mToFt(waveM),
      windState: windStateStr,
      windHours,
    };

    return NextResponse.json({ morning, morningLabel } satisfies SurfResult);

  } catch (e) {
    return NextResponse.json({ morning: null, morningLabel: '', error: String(e) });
  }
}
