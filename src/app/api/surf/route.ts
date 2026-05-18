import { NextResponse } from 'next/server';

export const revalidate = 3600; // cache 1 hour

interface SurfSlot {
  date: string;   // YYYY-MM-DD
  period: string; // AM | PM | Night
  waveHeightFt: number;
  windSpeedMph: number;
  windState: string;
}

interface SurfResult {
  morning: SurfSlot | null;
  morningLabel: string; // "Today" or "Tomorrow"
  error?: string;
}

function mToFt(m: number) { return Math.round(m * 3.281 * 2) / 2; } // round to nearest 0.5ft
function kphToMph(kph: number) { return Math.round(kph * 0.621); }

export async function GET() {
  try {
    const res = await fetch('https://www.surf-forecast.com/breaks/Topaz-Street/forecasts/latest/six_day', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const html = await res.text();

    // --- Parse time labels (AM/PM/Night per column) ---
    const timeLabelRe = /forecast-table__time[^>]*><span[^>]*>([^<]+)</g;
    const timePeriods: string[] = [];
    let m;
    while ((m = timeLabelRe.exec(html)) !== null) timePeriods.push(m[1].trim());

    // --- Parse day headers (data-date + colspan) ---
    const dayCellRe = /data-date="(\d{4}-\d{2}-\d{2})"[^>]*colspan="(\d+)"/g;
    const dayMap: { date: string; period: string }[] = [];
    while ((m = dayCellRe.exec(html)) !== null) {
      const date = m[1];
      const span = parseInt(m[2]);
      // Each day cell spans N time-period columns
      for (let i = 0; i < span; i++) {
        dayMap.push({ date, period: timePeriods[dayMap.length] ?? '' });
      }
    }

    // --- Parse wave heights ---
    const heightRe = /data-height="([^"]+)"/g;
    const heights: number[] = [];
    while ((m = heightRe.exec(html)) !== null) heights.push(parseFloat(m[1]));

    // --- Parse wind speeds ---
    const speedRe = /data-speed="([^"]+)"/g;
    const speeds: number[] = [];
    while ((m = speedRe.exec(html)) !== null) speeds.push(parseFloat(m[1]));

    // --- Parse wind states (skip the 6 tooltip definitions at the top) ---
    const wsRe = /wind-state wind-state--([^\s"<]+)/g;
    const allWs: string[] = [];
    while ((m = wsRe.exec(html)) !== null) allWs.push(m[1]);
    // The page defines 6 tooltip entries first; drop them
    const TOOLTIP_STATES = ['on', 'cross-on', 'cross', 'cross-off', 'off', 'glassy'];
    const windStates = allWs.slice(TOOLTIP_STATES.length);

    // --- Determine target: next upcoming AM slot (for 6am–11am window) ---
    // PT offset: UTC-7 (PDT) or UTC-8 (PST)
    const nowUtc = new Date();
    const ptHour = (nowUtc.getUTCHours() - 7 + 24) % 24; // approximate PDT
    const ptDateStr = nowUtc.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

    // Find AM columns
    const amCols = dayMap
      .map((d, i) => ({ ...d, idx: i }))
      .filter(d => d.period === 'AM');

    // Pick: today's AM if it's before 11am PT, else tomorrow's AM
    let target = amCols.find(c => c.date === ptDateStr && ptHour < 11)
      ?? amCols.find(c => c.date > ptDateStr);

    if (!target) {
      return NextResponse.json({ morning: null, morningLabel: '', error: 'No upcoming AM data' });
    }

    const idx = target.idx;
    const morning: SurfSlot = {
      date: target.date,
      period: 'AM',
      waveHeightFt: mToFt(heights[idx] ?? 0),
      windSpeedMph: kphToMph(speeds[idx] ?? 0),
      windState: windStates[idx] ?? '',
    };

    const morningLabel = target.date === ptDateStr ? 'Today' : 'Tomorrow';

    return NextResponse.json({ morning, morningLabel } satisfies SurfResult);
  } catch (e) {
    return NextResponse.json({ morning: null, morningLabel: '', error: String(e) });
  }
}
