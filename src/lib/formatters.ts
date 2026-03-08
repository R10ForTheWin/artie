export function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatDistance(meters: number | null): string {
  if (!meters) return '—';
  return `${(meters * 0.000621371).toFixed(2)} mi`;
}

export function formatDistanceShort(meters: number | null): string {
  if (!meters) return '—';
  return (meters * 0.000621371).toFixed(2);
}

export function formatDistanceMiles(meters: number | null): number {
  if (!meters) return 0;
  return parseFloat((meters * 0.000621371).toFixed(2));
}

export function formatSpeed(ms: number | null): string {
  if (!ms) return '—';
  return `${(ms * 2.23694).toFixed(1)} mph`;
}

export function formatHr(bpm: number | null): string {
  return bpm ? `${bpm} bpm` : '—';
}

export function formatCalories(cal: number | null): string {
  return cal ? `${cal} cal` : '—';
}

export function formatPace(secondsPerMile: number | null): string {
  if (!secondsPerMile) return '—';
  const m = Math.floor(secondsPerMile / 60);
  const s = Math.round(secondsPerMile % 60).toString().padStart(2, '0');
  return `${m}:${s} /mi`;
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const race = new Date(isoDate);
  race.setHours(0, 0, 0, 0);
  return Math.round((race.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
