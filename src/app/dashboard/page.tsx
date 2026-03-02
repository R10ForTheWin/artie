import Link from 'next/link';
import { pool, initSchema } from '@/lib/db';
import { formatDistanceMiles } from '@/lib/formatters';
import { TEAMMATES } from '@/lib/teammates';
import MileageChart from '@/components/MileageChart';
import WorkoutTable from '@/components/WorkoutTable';
import RaceCountdowns from '@/components/RaceCountdowns';
import StripeBar from '@/components/StripeBar';

export const dynamic = 'force-dynamic';

interface Workout {
  id: number;
  name: string;
  workout_date: string;
  distance_m: number | null;
  duration_s: number | null;
  avg_speed_ms: number | null;
  avg_hr: number | null;
  calories: number | null;
  location: string | null;
  mile_splits: number[] | null;
}

interface Race {
  id: number;
  name: string;
  race_date: string;
  location: string | null;
  logo: string | null;
}

export default async function DashboardPage() {
  await initSchema();
  const [workoutsResult, racesResult] = await Promise.all([
    pool.query('SELECT * FROM workouts ORDER BY distance_m DESC'),
    pool.query('SELECT * FROM races ORDER BY race_date ASC'),
  ]);
  const workouts = workoutsResult.rows as Workout[];
  const races = racesResult.rows as Race[];

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

      <div className="flex-1 px-6 py-10 max-w-5xl mx-auto w-full">
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

        <h1 className="text-navy font-black uppercase tracking-widest text-3xl mb-1">Dashboard</h1>
        <p className="text-navy opacity-40 text-sm mb-6">
          {workouts.length} workouts · {totalMiles.toFixed(1)} total miles
        </p>

        {/* Race Countdowns */}
        <div className="mb-8">
          <RaceCountdowns races={races} />
        </div>

        {/* Mileage Chart */}
        <div className="mb-8">
          <MileageChart data={chartData} />
        </div>

        {/* Workout Feed */}
        <WorkoutTable workouts={workouts} />

        {/* Photos placeholder */}
        <div className="mt-10 border-2 border-dashed border-navy border-opacity-20 rounded-lg p-8 text-center">
          <p className="text-navy font-black uppercase tracking-widest text-sm mb-2 opacity-50">Photos</p>
          <p className="text-navy opacity-30 text-sm">Coming soon — iCloud Shared Album integration</p>
        </div>
      </div>

      <StripeBar />
    </main>
  );
}
