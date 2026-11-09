import { NextRequest, NextResponse } from 'next/server';

/** Current air temperature (°F) at a break, from Open-Meteo. Cached 15 min. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get('lat') ?? 33.8385);
  const lon = Number(sp.get('lon') ?? -118.3945);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ current_f: null, error: 'bad coordinates' }, { status: 400 });
  }
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles`,
      { next: { revalidate: 900 } }
    );
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const data = await res.json();
    const t = data?.current?.temperature_2m;
    return NextResponse.json({ current_f: typeof t === 'number' ? Math.round(t) : null });
  } catch (err) {
    console.error('[air-temp]', err);
    return NextResponse.json({ current_f: null, error: 'unavailable' });
  }
}
