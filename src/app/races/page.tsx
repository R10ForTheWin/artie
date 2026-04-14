import { pool, initSchema } from '@/lib/db';
import RaceCountdowns from '@/components/RaceCountdowns';
import StripeBar from '@/components/StripeBar';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Race {
  id: number;
  name: string;
  race_date: string;
  location: string | null;
  logo: string | null;
  results: { place: number; name: string; time: string }[] | null;
  paddleguru_url: string | null;
}

export default async function RacesPage() {
  await initSchema();
  const result = await pool.query('SELECT * FROM races ORDER BY race_date ASC');
  const races = result.rows as Race[];

  // Build map of { raceDate -> { name -> workoutId } } for past races
  const pastDates = races.filter((r) => r.race_date < new Date().toISOString().slice(0, 10)).map((r) => r.race_date);
  const workoutLinks: Record<string, Record<string, number>> = {};
  if (pastDates.length > 0) {
    const wResult = await pool.query(
      'SELECT id, name, workout_date FROM workouts WHERE workout_date = ANY($1) AND distance_m >= 4828',
      [pastDates]
    );
    for (const w of wResult.rows as { id: number; name: string; workout_date: string }[]) {
      const date = w.workout_date.slice(0, 10);
      if (!workoutLinks[date]) workoutLinks[date] = {};
      workoutLinks[date][w.name] = w.id;
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar side="top" />
      <div className="flex-1 px-6 pt-10 pb-10 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider">
            ← Home
          </Link>
        </div>
        <h1 className="text-navy font-black uppercase tracking-widest text-3xl mb-6">Races</h1>
        <RaceCountdowns races={races} workoutLinks={workoutLinks} />
      </div>
      <StripeBar side="bottom" />
    </main>
  );
}
