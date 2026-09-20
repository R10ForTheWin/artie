export const ACTIVITIES = ['paddle', 'ocean_swim', 'pool_swim'] as const;
export type Activity = (typeof ACTIVITIES)[number];

export const ACTIVITY_LABELS: Record<Activity, string> = {
  paddle: 'Paddle',
  ocean_swim: 'Ocean Swim',
  pool_swim: 'Pool Swim',
};

/** Chart/legend colours, drawn from the theme palette. */
export const ACTIVITY_COLORS: Record<Activity, string> = {
  paddle: '#1B2A4A', // navy
  ocean_swim: '#5B8DB8', // sky
  pool_swim: '#C4532A', // terracotta
};

/**
 * Maps a sport name from Strava (`sport_type`), Garmin, or a FIT file onto our
 * tracked activities. Anything not recognised as a swim is a paddle, which keeps
 * every workout logged before swim tracking existed correct.
 *
 * Strava reports both open-water and pool sessions as plain "Swim", so a swim
 * defaults to ocean and can be corrected on the workout's edit page.
 */
export function classifyActivity(sport?: string | null): Activity {
  if (!sport) return 'paddle';
  if (/pool|lap swim/i.test(sport)) return 'pool_swim';
  if (/swim/i.test(sport)) return 'ocean_swim';
  return 'paddle';
}

export function isActivity(value: unknown): value is Activity {
  return typeof value === 'string' && (ACTIVITIES as readonly string[]).includes(value);
}
