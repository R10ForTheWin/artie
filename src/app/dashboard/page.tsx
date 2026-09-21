import Link from 'next/link';
import { pool, initSchema } from '@/lib/db';
import { formatDistanceMiles } from '@/lib/formatters';
import { TEAMMATES } from '@/lib/teammates';
import { SEASONS, formatSeasonRange, seasonMembers } from '@/lib/seasons';
import MileageChart from '@/components/MileageChart';
import WorkoutTable from '@/components/WorkoutTable';
import StripeBar from '@/components/StripeBar';
import type { Activity } from '@/lib/activity';

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
  is_race: boolean | null;
  activity: Activity;
}

export default async function DashboardPage() {
  await initSchema();
  const workoutsResult = await pool.query('SELECT * FROM workouts ORDER BY workout_date DESC');
  const teammateOrder = Object.fromEntries(TEAMMATES.map((t, i) => [t, i]));
  const workouts = (workoutsResult.rows as Workout[]).sort((a, b) => {
    if (b.workout_date !== a.workout_date) return b.workout_date.localeCompare(a.workout_date);
    return (teammateOrder[a.name] ?? 99) - (teammateOrder[b.name] ?? 99);
  });

  const seasons = SEASONS.map((season) => {
    const roster = seasonMembers(season);
    const mileageMap = Object.fromEntries(roster.map((t) => [t, 0]));
    const oceanSwimMap = Object.fromEntries(roster.map((t) => [t, 0]));
    const poolSwimMap = Object.fromEntries(roster.map((t) => [t, 0]));
    const lastDateMap = Object.fromEntries(roster.map((t) => [t, '']));

    for (const w of workouts) {
      if (!(w.name in mileageMap) || !w.distance_m) continue;
      if (w.workout_date < season.start || w.workout_date > season.end) continue;
      const bucket =
        w.activity === 'ocean_swim' ? oceanSwimMap : w.activity === 'pool_swim' ? poolSwimMap : mileageMap;
      bucket[w.name] += formatDistanceMiles(w.distance_m);
      if (w.workout_date > lastDateMap[w.name]) lastDateMap[w.name] = w.workout_date;
    }

    const data = roster
      .map((name, i) => ({
        name,
        miles: parseFloat(mileageMap[name].toFixed(2)),
        oceanSwimMiles: parseFloat(oceanSwimMap[name].toFixed(2)),
        poolSwimMiles: parseFloat(poolSwimMap[name].toFixed(2)),
        lastDate: lastDateMap[name],
        order: i,
      }))
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate) || a.order - b.order)
      .map(({ name, miles, oceanSwimMiles, poolSwimMiles }) => ({ name, miles, oceanSwimMiles, poolSwimMiles }));

    // Paddle-only total, so the headline number stays comparable season to season
    const paddleMiles = Object.values(mileageMap).reduce((a, b) => a + b, 0);
    const swimMiles =
      Object.values(oceanSwimMap).reduce((a, b) => a + b, 0) + Object.values(poolSwimMap).reduce((a, b) => a + b, 0);

    return { season, data, paddleMiles, swimMiles };
  });

  const currentSeason = seasons[0];

  const racesResult = await pool.query('SELECT race_date FROM races');
  const raceDates = new Set(racesResult.rows.map((r: { race_date: string }) => r.race_date));

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar />

      <div className="flex-1 px-6 pt-10 pb-0 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Link href="/" className="border-2 border-navy/20 text-navy font-black uppercase tracking-wider text-xs px-4 py-2.5 rounded-lg hover:border-navy/60 transition-colors whitespace-nowrap">
            ← Home
          </Link>
          <div className="flex-1" />
          <Link href="/upload" className="bg-navy text-white font-black uppercase tracking-wider text-xs px-4 py-2.5 rounded-lg hover:bg-terracotta transition-colors whitespace-nowrap">
            + Upload
          </Link>
          <Link href="/strava" className="bg-terracotta text-white font-black uppercase tracking-wider text-xs px-4 py-2.5 rounded-lg hover:bg-gold transition-colors whitespace-nowrap">
            Sync Strava
          </Link>
        </div>

        <p className="text-navy opacity-40 text-sm mb-6">
          {workouts.length} workouts · {currentSeason.paddleMiles.toFixed(1)} paddle miles this season
          {currentSeason.swimMiles > 0 && <> · {currentSeason.swimMiles.toFixed(1)} swim miles</>}
        </p>

        {/* Mileage Charts — newest season first */}
        <div className="mb-8 space-y-6">
          {seasons.map(({ season, data }, i) => (
            <MileageChart
              key={season.label}
              data={data}
              title={season.label}
              subtitle={formatSeasonRange(season)}
              showSwims={season.showSwims}
              defaultOpen={i === 0}
            />
          ))}
        </div>

        {/* Workout Feed */}
        <WorkoutTable workouts={workouts} raceDates={raceDates} />

      </div>

      <StripeBar side="bottom" />
    </main>
  );
}
