import { NextRequest, NextResponse } from 'next/server';

const YEARS_OF_HISTORY = 10;
const SMOOTH_DAYS = 7;

/**
 * Air temperature at a break, from Open-Meteo:
 * - current_f: right now (cached 15 min)
 * - history: the last year of daily highs, each with the 10-year average high
 *   for that time of year (±7 days), the same shape as /api/ocean-temp
 *   (cached 24 h)
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get('lat') ?? 33.8385);
  const lon = Number(sp.get('lon') ?? -118.3945);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ current_f: null, history: [], error: 'bad coordinates' }, { status: 400 });
  }

  const [current_f, history] = await Promise.all([currentTemp(lat, lon), dailyHistory(lat, lon)]);
  return NextResponse.json({ current_f, history });
}

async function currentTemp(lat: number, lon: number): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles`,
      { next: { revalidate: 900 } }
    );
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const t = (await res.json())?.current?.temperature_2m;
    return typeof t === 'number' ? Math.round(t) : null;
  } catch (err) {
    console.error('[air-temp] current', err);
    return null;
  }
}

/** Day of year 0–365, ignoring the year, so dates line up across years. */
function dayOfYear(date: string): number {
  const [, m, d] = date.split('-').map(Number);
  return Math.round((Date.UTC(2001, m - 1, d) - Date.UTC(2001, 0, 1)) / 86400000);
}

async function dailyHistory(lat: number, lon: number): Promise<{ date: string; temp_f: number; norm_f: number }[]> {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    const start = `${Number(today.slice(0, 4)) - YEARS_OF_HISTORY - 1}-01-01`;
    const res = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${today}&daily=temperature_2m_max&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) throw new Error(`Open-Meteo archive ${res.status}`);
    const daily = (await res.json())?.daily;
    const dates: string[] = daily?.time ?? [];
    const highs: (number | null)[] = daily?.temperature_2m_max ?? [];

    // Average high by day of year, from the years before the one being charted
    const yearAgo = new Date(Date.parse(today) - 365 * 86400000).toISOString().slice(0, 10);
    const sums = new Array(366).fill(0);
    const counts = new Array(366).fill(0);
    dates.forEach((date, i) => {
      const v = highs[i];
      if (v == null || date >= yearAgo) return;
      const doy = dayOfYear(date);
      sums[doy] += v;
      counts[doy] += 1;
    });
    const norm = (doy: number) => {
      let s = 0, c = 0;
      for (let k = -SMOOTH_DAYS; k <= SMOOTH_DAYS; k++) {
        const j = (doy + k + 366) % 366;
        s += sums[j];
        c += counts[j];
      }
      return c ? Math.round(s / c) : null;
    };

    const out: { date: string; temp_f: number; norm_f: number }[] = [];
    dates.forEach((date, i) => {
      const v = highs[i];
      if (v == null || date < yearAgo) return;
      const n = norm(dayOfYear(date));
      if (n != null) out.push({ date, temp_f: Math.round(v), norm_f: n });
    });
    return out;
  } catch (err) {
    console.error('[air-temp] history', err);
    return [];
  }
}
