import Link from 'next/link';
import { pool, initSchema } from '@/lib/db';
import { formatDistanceMiles } from '@/lib/formatters';
import { TEAMMATES } from '@/lib/teammates';
import { SEASONS, seasonMembers } from '@/lib/seasons';
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
  hide_from_chart: boolean;
}

export default async function DashboardPage() {
  await initSchema();
  const workoutsResult = await pool.query('SELECT * FROM workouts ORDER BY workout_date DESC');
  const teammateOrder = Object.fromEntries(TEAMMATES.map((t, i) => [t, i]));
  const workouts = (workoutsResult.rows as Workout[]).sort((a, b) => {
    if (b.workout_date !== a.workout_date) return b.workout_date.localeCompare(a.workout_date);
    return (teammateOrder[a.name] ?? 99) - (teammateOrder[b.name] ?? 99);
  });

  // People who added themselves aren't in the hard-coded season rosters. They
  // join a season's chart once they log something inside it.
  const peopleResult = await pool.query('SELECT name FROM people');
  const joiners = (peopleResult.rows as { name: string }[])
    .map((p) => p.name)
    .filter((n) => !(TEAMMATES as readonly string[]).includes(n));

  const linkedResult = await pool.query('SELECT name FROM strava_tokens');
  const linked = new Set<string>(linkedResult.rows.map((r: { name: string }) => r.name));

  const seasons = SEASONS.map((season) => {
    const activeJoiners = joiners.filter((n) =>
      workouts.some((w) => w.name === n && w.workout_date >= season.start && w.workout_date <= season.end)
    );
    // A teammate who links Strava joins the current season's chart
    const members = season.members
      ? TEAMMATES.filter((t) => season.members!.includes(t) || (season === SEASONS[0] && linked.has(t)))
      : seasonMembers(season);
    const roster: string[] = [...members, ...activeJoiners];
    const mileageMap = Object.fromEntries(roster.map((t) => [t, 0]));
    const swimMap = Object.fromEntries(roster.map((t) => [t, 0]));
    const lastDateMap = Object.fromEntries(roster.map((t) => [t, '']));

    for (const w of workouts) {
      if (!(w.name in mileageMap) || !w.distance_m || w.hide_from_chart) continue;
      if (w.workout_date < season.start || w.workout_date > season.end) continue;
      const bucket = w.activity === 'swim' ? swimMap : mileageMap;
      bucket[w.name] += formatDistanceMiles(w.distance_m);
      if (w.workout_date > lastDateMap[w.name]) lastDateMap[w.name] = w.workout_date;
    }

    const data = roster
      .map((name, i) => ({
        name,
        miles: parseFloat(mileageMap[name].toFixed(2)),
        swimMiles: parseFloat(swimMap[name].toFixed(2)),
        lastDate: lastDateMap[name],
        order: i,
      }))
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate) || a.order - b.order)
      .map(({ name, miles, swimMiles }) => ({ name, miles, swimMiles }));

    // Paddle-only total, so the headline number stays comparable season to season
    const paddleMiles = Object.values(mileageMap).reduce((a, b) => a + b, 0);
    const swimMiles = Object.values(swimMap).reduce((a, b) => a + b, 0);

    return { season, data, paddleMiles, swimMiles };
  });


  const racesResult = await pool.query('SELECT race_date FROM races');
  const raceDates = new Set(racesResult.rows.map((r: { race_date: string }) => r.race_date));

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar />

      <div className="flex-1 px-6 pt-10 pb-0 max-w-5xl mx-auto w-full">
        {/* Header */}
        {/* Three equal buttons: same width, and stretched to the same height
            when the longer labels wrap to two lines on a phone */}
        <div className="grid grid-cols-3 gap-2 mb-6 sm:flex sm:items-stretch">
          <Link href="/" className="flex items-center justify-center border-2 border-navy/20 text-navy font-black uppercase tracking-wider text-xs px-3 sm:px-4 py-2 rounded-lg hover:border-navy/60 transition-colors text-center leading-tight">
            ← Home
          </Link>
          {/* On wider screens the buttons sit at their natural width, Home on the left */}
          <div className="hidden sm:block sm:flex-1" />
          <Link href="/upload" className="flex items-center justify-center border-2 border-transparent bg-navy text-white font-black uppercase tracking-wider text-xs px-3 sm:px-4 py-2 rounded-lg hover:bg-terracotta transition-colors text-center leading-tight">
            Add workout manually
          </Link>
          <Link href="/strava" className="flex items-center justify-center border-2 border-transparent bg-terracotta text-white font-black uppercase tracking-wider text-xs px-3 sm:px-4 py-2 rounded-lg hover:bg-gold transition-colors text-center leading-tight">
            Link with Strava
          </Link>
        </div>


        {/* Each season's chart heads its own months, newest first. Anything
            older than the oldest season stays with that last section. */}
        <div className="space-y-10">
          {seasons.map(({ season, data }, i) => {
            const isLast = i === seasons.length - 1;
            const inSeason = workouts.filter((w) => {
              const d = w.workout_date.slice(0, 10);
              return d <= season.end && (d >= season.start || isLast);
            });
            return (
              <section key={season.label} className="space-y-4">
                <MileageChart
                  data={data}
                  title={season.label}
                  showSwims={season.showSwims}
                  defaultOpen={i === 0}
                />
                {inSeason.length > 0 && <WorkoutTable workouts={inSeason} raceDates={raceDates} showHint={i === 0} />}
              </section>
            );
          })}
        </div>

      </div>

      <StripeBar side="bottom" />
    </main>
  );
}
