/* eslint-disable @typescript-eslint/no-explicit-any */
import FitParser from 'fit-file-parser';
import { ParsedWorkout } from './index';

export function parseFit(buffer: Buffer): Promise<ParsedWorkout> {
  return new Promise((resolve, reject) => {
    const parser = new FitParser({
      force: true,
      speedUnit: 'm/s',
      lengthUnit: 'm',
      temperatureUnit: 'celsius',
      elapsedRecordField: true,
    });

    (parser as any).parse(buffer, (error: any, data: any) => {
      if (error) return reject(new Error(String(error)));

      const session = data?.activity?.sessions?.[0];
      if (!session) return reject(new Error('No session found in FIT file'));

      const startTime: Date | undefined = session.start_time;

      resolve({
        workout_date: startTime?.toISOString() ?? new Date().toISOString(),
        duration_s:   session.total_elapsed_time  ?? null,
        distance_m:   session.total_distance       ?? null,
        avg_speed_ms: session.avg_speed            ?? null,
        max_speed_ms: session.max_speed            ?? null,
        avg_hr:       session.avg_heart_rate       ?? null,
        max_hr:       session.max_heart_rate       ?? null,
        calories:     session.total_calories       ?? null,
      });
    });
  });
}
