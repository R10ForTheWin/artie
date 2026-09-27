import type { ParsedWorkout } from './parsers';

/** The numeric activity id from any shape of Garmin Connect activity link. */
export function extractGarminActivityId(url: string): string | null {
  const match = url.match(/connect\.garmin\.com\/(?:modern\/|app\/)?activity\/(\d+)/i);
  return match ? match[1] : null;
}

function parseDurationToSeconds(str: string): number | null {
  const parts = str.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

/**
 * A public Garmin activity page carries a one-line summary in its share tags:
 * distance, time and speed, plus a map thumbnail and the activity title. It has
 * no date, so the caller supplies one.
 */
export async function fetchGarminActivityFromPage(activityId: string, workoutDate: string): Promise<ParsedWorkout & { map_image_url: string | null; title: string | null }> {
  const pageUrl = `https://connect.garmin.com/modern/activity/${activityId}`;
  const res = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html',
    },
    redirect: 'follow',
  });

  if (!res.ok) throw new Error('Could not load Garmin activity page');

  const html = await res.text();

  const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
  const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
  const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);

  if (!descMatch) throw new Error('Could not find workout data on Garmin activity page');

  const desc = descMatch[1];
  // Format: "Distance 4.79 mi | Time 1:03:08 | Speed 4.6 mph"
  const distanceMatch = desc.match(/Distance ([\d.]+) mi/);
  const timeMatch = desc.match(/Time ([\d:]+)/);
  const speedMatch = desc.match(/Speed ([\d.]+) mph/);

  const distance_m = distanceMatch ? parseFloat(distanceMatch[1]) * 1609.344 : null;
  const duration_s = timeMatch ? parseDurationToSeconds(timeMatch[1]) : null;
  const avg_speed_ms = speedMatch ? parseFloat(speedMatch[1]) * 0.44704 : null;

  if (!distance_m && !duration_s) {
    throw new Error('Could not parse workout data from Garmin activity page');
  }

  return {
    workout_date: workoutDate,
    duration_s,
    distance_m,
    avg_speed_ms,
    max_speed_ms: null,
    avg_hr: null,
    max_hr: null,
    calories: null,
    map_image_url: imageMatch ? imageMatch[1] : null,
    title: titleMatch ? titleMatch[1] : null,
  };
}
