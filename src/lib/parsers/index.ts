import { parseFit } from './fitParser';
import { parseGpx } from './gpxParser';

export interface ParsedWorkout {
  workout_date: string;
  duration_s: number | null;
  distance_m: number | null;
  avg_speed_ms: number | null;
  max_speed_ms: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  calories: number | null;
}

export async function parseWorkoutFile(
  buffer: Buffer,
  fileType: 'fit' | 'gpx'
): Promise<ParsedWorkout> {
  if (fileType === 'fit') return parseFit(buffer);
  if (fileType === 'gpx') return parseGpx(buffer);
  throw new Error(`Unsupported file type: ${fileType}`);
}
