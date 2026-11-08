// Pool and ocean swims are one activity: Strava can't tell them apart, and
// splitting them only caused mislabels.
export const ACTIVITIES = ['paddle', 'swim'] as const;
export type Activity = (typeof ACTIVITIES)[number];

export const ACTIVITY_LABELS: Record<Activity, string> = {
  paddle: 'Paddle',
  swim: 'Swim',
};

/** Chart/legend colours, drawn from the theme palette. */
export const ACTIVITY_COLORS: Record<Activity, string> = {
  paddle: '#1B2A4A', // navy
  swim: '#5B8DB8', // sky
};

/**
 * Maps a sport name from Strava (`sport_type`), Garmin, or a FIT file onto our
 * tracked activities. Anything not recognised as a swim is a paddle, which keeps
 * every workout logged before swim tracking existed correct.
 */
export function classifyActivity(sport?: string | null): Activity {
  if (!sport) return 'paddle';
  if (/swim/i.test(sport)) return 'swim';
  return 'paddle';
}

export function isActivity(value: unknown): value is Activity {
  return typeof value === 'string' && (ACTIVITIES as readonly string[]).includes(value);
}
