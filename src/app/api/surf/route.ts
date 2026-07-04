import { NextResponse } from 'next/server';

export const revalidate = 3600;

// Topaz Street, Manhattan Beach, CA
const LAT = 33.886;
const LON = -118.406;

// Coast faces ~270° (west). Offshore = wind from east (90°).
// angle_from_offshore: 0=offshore, 180=onshore
function windState(avgSpeedMph: number, avgDirDeg: number): string {
  if (avgSpeedMph < 4) return 'glassy';
  const raw = Math.abs(avgDirDeg - 90);
  const angle = raw > 180 ? 360 - raw : raw;
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

interface WindHour {
  hour: number;
  speedMph: number;
  direction: string;
}

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

export async function GET() {
  try {
    const nowPT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const ptDateStr = `${nowPT.getFullYear()}-${String(nowPT.getMonth() + 1).padStart(2, '0')}-${String(nowPT.getDate()).padStart(2, '0')}`;
    const ptHour = nowPT.getHours();

    // Target date: today if before 11am PT, otherwise tomorrow
    const targetDate = ptHour < 11 ? ptDateStr : (() => {
      const d = new Date(nowPT);
      d.setDate(d.getDate() + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    const morningLabel = targetDate === ptDateStr ? 'Today' : 'Tomorrow';

    // Fetch wind + wave data together from Open-Meteo
    const [meteoRes, marineRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=mph&timezone=America%2FLos_Angeles&forecast_days=3`,
        { next: { revalidate: 3600 } }
      ),
      fetch(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}&hourly=wave_height&timezone=America%2FLos_Angeles&forecast_days=3`,
        { next: { revalidate: 3600 } }
      ),
    ]);

    if (!meteoRes.ok) throw new Error(`open-meteo wind fetch failed: ${meteoRes.status}`);
    if (!marineRes.ok) throw new Error(`open-meteo marine fetch failed: ${marineRes.status}`);

    const meteo = await meteoRes.json();
    const marine = await marineRes.json();

    const windTimes: string[]   = meteo.hourly.time;
    const windSpeeds: number[]  = meteo.hourly.wind_speed_10m;
    const windDirs: number[]    = meteo.hourly.wind_direction_10m;

    const waveTimes: string[]   = marine.hourly.time;
    const waveHeights: number[] = marine.hourly.wave_height;

    // Collect 6–11am data for target date
    const windHours: WindHour[] = [];
    const morningWindSpeeds: number[] = [];
    const morningWindDirs: number[] = [];
    const morningWaveHeights: number[] = [];

    for (let hr = 6; hr <= 11; hr++) {
      const ts = `${targetDate}T${String(hr).padStart(2, '0')}:00`;

      const wi = windTimes.indexOf(ts);
      if (wi >= 0) {
        windHours.push({ hour: hr, speedMph: Math.round(windSpeeds[wi]), direction: degToCardinal(windDirs[wi]) });
        morningWindSpeeds.push(windSpeeds[wi]);
        morningWindDirs.push(windDirs[wi]);
      }

      const mi = waveTimes.indexOf(ts);
      if (mi >= 0) morningWaveHeights.push(waveHeights[mi]);
    }

    if (morningWaveHeights.length === 0) {
      return NextResponse.json({ morning: null, morningLabel: '', error: 'No morning wave data' });
    }

    const avgWaveM = morningWaveHeights.reduce((a, b) => a + b, 0) / morningWaveHeights.length;
    const avgWindSpeed = morningWindSpeeds.length
      ? morningWindSpeeds.reduce((a, b) => a + b, 0) / morningWindSpeeds.length
      : 0;
    const avgWindDir = morningWindDirs.length
      ? morningWindDirs.reduce((a, b) => a + b, 0) / morningWindDirs.length
      : 0;

    const morning: SurfSlot = {
      date: targetDate,
      waveHeightFt: mToFt(avgWaveM),
      windState: windState(avgWindSpeed, avgWindDir),
      windHours,
    };

    return NextResponse.json({ morning, morningLabel } satisfies SurfResult);

  } catch (e) {
    return NextResponse.json({ morning: null, morningLabel: '', error: String(e) });
  }
}
