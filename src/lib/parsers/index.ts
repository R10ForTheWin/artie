import { parseFit } from './fitParser';
import { parseGpx } from './gpxParser';
import { parseImage } from './imageParser';

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
  fileType: 'fit' | 'gpx' | 'image',
  mimeType?: string
): Promise<ParsedWorkout> {
  if (fileType === 'fit') return parseFit(buffer);
  if (fileType === 'gpx') return parseGpx(buffer);
  if (fileType === 'image') return parseImage(buffer, mimeType ?? 'image/jpeg');
  throw new Error(`Unsupported file type: ${fileType}`);
}
