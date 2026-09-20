export interface Season {
  label: string;
  /** Inclusive ISO date (YYYY-MM-DD). */
  start: string;
  /** Inclusive ISO date (YYYY-MM-DD). */
  end: string;
  /** Swim tracking began with the 2027 season; earlier seasons are paddle-only. */
  showSwims: boolean;
}

/**
 * A season runs from the September after one Catalina Classic to the end of the
 * next August, so the whole build-up and race calendar sit in one bucket. Newest
 * first — the dashboard renders them in this order.
 */
export const SEASONS: Season[] = [
  { label: '2027 Season', start: '2026-09-01', end: '2027-08-31', showSwims: true },
  { label: '2026 Season', start: '2026-03-01', end: '2026-08-31', showSwims: false },
];

export function formatSeasonRange({ start, end }: Season): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return `${fmt(start)} – ${fmt(end)}`;
}
