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
}

export default async function DashboardPage() {
  await initSchema();
  const workoutsResult = await pool.query('SELECT * FROM workouts ORDER BY distance_m DESC');
  const workouts = workoutsResult.rows as Workout[];

  const mileageMap = Object.fromEntries(TEAMMATES.map((t) => [t, 0]));
  for (const w of workouts) {
    if (w.name in mileageMap && w.distance_m) {
      mileageMap[w.name] += formatDistanceMiles(w.distance_m);
    }
  }
  const chartData = TEAMMATES.map((name) => ({
    name,
    miles: parseFloat(mileageMap[name].toFixed(2)),
  }));

  const totalMiles = Object.values(mileageMap).reduce((a, b) => a + b, 0);

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar />

      <div className="flex-1 px-6 pt-10 pb-0 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider">
            ← Home
          </Link>
          <Link
            href="/upload"
            className="bg-navy text-white font-black uppercase tracking-wider text-sm px-5 py-2 rounded-lg hover:bg-terracotta transition-colors"
          >
            + Upload Garmin File
          </Link>
        </div>

        <p className="text-navy opacity-40 text-sm mb-6">
          {workouts.length} workouts · {totalMiles.toFixed(1)} total miles
        </p>

        {/* Mileage Chart */}
        <div className="mb-8">
          <MileageChart data={chartData} />
        </div>

        {/* Workout Feed */}
        <WorkoutTable workouts={workouts} />

      </div>

      <StripeBar side="bottom" />
    </main>
  );
}
