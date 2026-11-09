export const COURSES = ['Topaz', 'MDR', 'Catalina', 'Cabrillo', 'Newport', 'Malibu', 'Coronado', 'Naples', 'King Harbor', 'Ventura', 'Channel Islands', 'Other'];

/**
 * Where paddles start, for naming a GPS start point (Strava's start_latlng).
 * Course names match COURSES; the rest are one-off spots the crew has paddled.
 */
const SPOTS: { name: string; lat: number; lng: number }[] = [
  { name: 'Topaz', lat: 33.8324, lng: -118.3907 },
  { name: 'King Harbor', lat: 33.8430, lng: -118.3980 },
  { name: 'Hermosa', lat: 33.8600, lng: -118.4050 },
  { name: 'Manhattan Beach', lat: 33.8843, lng: -118.4139 },
  { name: 'Malaga Cove', lat: 33.8100, lng: -118.3960 },
  { name: 'MDR', lat: 33.9810, lng: -118.4560 },
  { name: 'Cabrillo', lat: 33.7100, lng: -118.2800 },
  { name: 'Naples', lat: 33.7500, lng: -118.1250 },
  { name: 'Newport', lat: 33.6247, lng: -117.8926 },
  { name: 'Catalina', lat: 33.4400, lng: -118.5000 },
  { name: 'Malibu', lat: 34.0800, lng: -119.0700 },
  { name: 'Ventura', lat: 34.2500, lng: -119.2700 },
  { name: 'Channel Islands', lat: 34.1880, lng: -119.2250 },
  { name: 'Coronado', lat: 32.6739, lng: -117.1804 },
  { name: 'Cardiff', lat: 33.0002, lng: -117.2817 },
  { name: 'Avila Beach', lat: 35.1750, lng: -120.7525 },
  { name: 'Big Sur', lat: 35.9219, lng: -121.4696 },
  { name: 'Santa Cruz', lat: 36.9714, lng: -121.9512 },
];

/** The nearest known spot within 3 km of a start point, or null. */
export function nearestSpot(latlng: unknown): string | null {
  if (!Array.isArray(latlng) || latlng.length !== 2) return null;
  const [lat, lng] = latlng as number[];
  let best: string | null = null;
  let bestKm = 3;
  for (const s of SPOTS) {
    const dy = (s.lat - lat) * 111;
    const dx = (s.lng - lng) * 111 * Math.cos((lat * Math.PI) / 180);
    const km = Math.hypot(dx, dy);
    if (km < bestKm) { bestKm = km; best = s.name; }
  }
  return best;
}
