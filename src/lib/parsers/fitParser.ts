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

      // Extract mile splits from auto-lap data (if device is set to 1-mile laps)
      const MILE_M = 1609.344;
      const TOLERANCE = 0.15;
      const laps: any[] = session.laps ?? [];
      let mile_splits: number[] | null = null;
      if (laps.length >= 2) {
        const fullMileLaps = laps.filter((lap: any) => {
          const dist = lap.total_distance;
          return dist >= MILE_M * (1 - TOLERANCE) && dist <= MILE_M * (1 + TOLERANCE);
        });
        const allButLast = laps.slice(0, -1);
        const allButLastAreMiles = allButLast.every((lap: any) => {
          const dist = lap.total_distance;
          return dist >= MILE_M * (1 - TOLERANCE) && dist <= MILE_M * (1 + TOLERANCE);
        });
        if (allButLastAreMiles && fullMileLaps.length >= 1) {
          mile_splits = fullMileLaps.map((lap: any) => lap.total_elapsed_time as number);
        }
      }

      resolve({
        workout_date: startTime?.toISOString() ?? new Date().toISOString(),
        duration_s:   session.total_elapsed_time  ?? null,
        distance_m:   session.total_distance       ?? null,
        avg_speed_ms: session.avg_speed            ?? null,
        max_speed_ms: session.max_speed            ?? null,
        avg_hr:       session.avg_heart_rate       ?? null,
        max_hr:       session.max_heart_rate       ?? null,
        calories:     session.total_calories       ?? null,
        mile_splits:  mile_splits,
      });
    });
  });
}
