import Link from 'next/link';
import { pool, initSchema } from '@/lib/db';
import { formatDistanceMiles } from '@/lib/formatters';
import { TEAMMATES } from '@/lib/teammates';
import MileageChart from '@/components/MileageChart';
import WorkoutTable from '@/components/WorkoutTable';
import StripeBar from '@/components/StripeBar';

export const dynamic = 'force-dynamic';

interface Workout {
  id: number;
  name: string;
  workout_date: string;
  distance_m: number | null;
  duration_s: number | null;
  avg_speed_ms: number | null;
  calories: number | null;
  location: string | null;
  mile_splits: number[] | null;
  file_name: string;
  file_type: string;
}

export default async function DashboardPage() {
  await initSchema();
  const workoutsResult = await pool.query('SELECT * FROM workouts ORDER BY workout_date DESC');
  const teammateOrder = Object.fromEntries(TEAMMATES.map((t, i) => [t, i]));
  const workouts = (workoutsResult.rows as Workout[]).sort((a, b) => {
    if (b.workout_date !== a.workout_date) return b.workout_date.localeCompare(a.workout_date);
    return (teammateOrder[a.name] ?? 99) - (teammateOrder[b.name] ?? 99);
  });

  const CHART_START = '2026-03-01';
  const mileageMap = Object.fromEntries(TEAMMATES.map((t) => [t, 0]));
  const lastDateMap = Object.fromEntries(TEAMMATES.map((t) => [t, '']));
  for (const w of workouts) {
    if (w.name in mileageMap && w.distance_m) {
      if (w.workout_date >= CHART_START) mileageMap[w.name] += formatDistanceMiles(w.distance_m);
      if (w.workout_date > lastDateMap[w.name]) lastDateMap[w.name] = w.workout_date;
    }
  }
  const chartData = TEAMMATES
    .map((name, i) => ({ name, miles: parseFloat(mileageMap[name].toFixed(2)), lastDate: lastDateMap[name], order: i }))
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate) || a.order - b.order)
    .map(({ name, miles }) => ({ name, miles }));

  const totalMiles = Object.values(mileageMap).reduce((a, b) => a + b, 0);

  const racesResult = await pool.query('SELECT race_date FROM races');
  const raceDates = new Set(racesResult.rows.map((r: { race_date: string }) => r.race_date));

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar />

      <div className="flex-1 px-6 pt-10 pb-0 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider">
            ← Home
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/upload"
              className="bg-navy text-white font-black uppercase tracking-wider text-sm px-5 py-2 rounded-lg hover:bg-terracotta transition-colors"
            >
              + Upload Garmin File
            </Link>
            <Link
              href="/strava"
              className="bg-terracotta text-white font-black uppercase tracking-wider text-sm px-5 py-2 rounded-lg hover:bg-gold transition-colors"
            >
              Sync with Strava (Beta)
            </Link>
          </div>
        </div>

        <p className="text-navy opacity-40 text-sm mb-6">
          {workouts.length} workouts · {totalMiles.toFixed(1)} total miles
        </p>

        {/* Mileage Chart */}
        <div className="mb-8">
          <MileageChart data={chartData} />
        </div>

        {/* Workout Feed */}
        <WorkoutTable workouts={workouts} raceDates={raceDates} />

      </div>

      <StripeBar side="bottom" />
    </main>
  );
}
