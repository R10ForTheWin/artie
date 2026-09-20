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
 * A season runs September through August — from the month after one Catalina
 * Classic to the end of the next race calendar — so the whole off-season build-up
 * and the races it leads to sit in one bucket. Labelled by the two calendar years
 * it spans. Newest first; the dashboard renders them in this order.
 */
export const SEASONS: Season[] = [
  { label: '2026/2027 Season', start: '2026-09-01', end: '2027-08-31', showSwims: true },
  { label: '2025/2026 Season', start: '2025-09-01', end: '2026-08-31', showSwims: false },
];

export function formatSeasonRange({ start, end }: Season): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return `${fmt(start)} – ${fmt(end)}`;
}
