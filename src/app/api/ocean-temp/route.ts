import { NextResponse } from 'next/server';

// Historical avg water temps (°F) for Manhattan Beach via seatemperature.org
const MONTHLY_NORMS_F: Record<number, number> = {
  1: 59, 2: 57, 3: 57, 4: 59, 5: 63, 6: 64,
  7: 68, 8: 68, 9: 68, 10: 66, 11: 63, 12: 61,
};

export async function GET() {
  try {
    // NDBC Station 46222 — San Pedro Channel, ~10mi from Manhattan Beach
    const res = await fetch('https://www.ndbc.noaa.gov/data/realtime2/46222.txt', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`NDBC fetch failed: ${res.status}`);
    const text = await res.text();

    // Parse: skip header lines (#), collect WTMP (col 14) per day
    const dayMap = new Map<string, number[]>();

    for (const line of text.split('\n')) {
      if (line.startsWith('#') || !line.trim()) continue;
      const parts = line.trim().split(/\s+/);
      if (parts.length < 15) continue;
      const yr = parts[0], mo = parts[1], dy = parts[2];
      const wtmp = parts[14];
      const val = parseFloat(wtmp);
      if (wtmp === 'MM' || isNaN(val)) continue;
      const dateStr = `${yr}-${mo.padStart(2, '0')}-${dy.padStart(2, '0')}`;
      if (!dayMap.has(dateStr)) dayMap.set(dateStr, []);
      dayMap.get(dateStr)!.push(val);
    }

    const sortedDates = Array.from(dayMap.keys()).sort().slice(-45);

    const history = sortedDates.map((date) => {
      const readings = dayMap.get(date)!;
      const avg_c = readings.reduce((a, b) => a + b, 0) / readings.length;
      const temp_f = Math.round((avg_c * 9 / 5 + 32) * 10) / 10;
      const month = parseInt(date.split('-')[1]);
      return { date, temp_f, norm_f: MONTHLY_NORMS_F[month] };
    });

    const current_f = history.length > 0 ? history[history.length - 1].temp_f : null;

    return NextResponse.json(
      { current_f, history },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    );
  } catch (err) {
    console.error('ocean-temp API error:', err);
    return NextResponse.json({ error: 'Failed to fetch ocean temp' }, { status: 500 });
  }
}
