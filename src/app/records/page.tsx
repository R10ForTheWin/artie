import Link from 'next/link';
import { pool, initSchema } from '@/lib/db';
import { formatPace, formatSpeed } from '@/lib/formatters';
import StripeBar from '@/components/StripeBar';

export const dynamic = 'force-dynamic';

interface SplitRow {
  id: number;
  name: string;
  workout_date: string;
  location: string | null;
  split_s: number;
}

export default async function RecordsPage() {
  await initSchema();

  // Unnest mile_splits array and find top 3 fastest individual miles
  const result = await pool.query<SplitRow>(`
    SELECT w.id, w.name, w.workout_date, w.location, s.split_s
    FROM workouts w,
    LATERAL jsonb_array_elements_text(w.mile_splits) AS s(split_s)
    WHERE w.mile_splits IS NOT NULL
    ORDER BY s.split_s::numeric ASC
    LIMIT 3
  `);

  const top3 = result.rows;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar />

      <div className="flex-1 px-6 pt-10 pb-10 max-w-2xl mx-auto w-full">
        <Link href="/" className="text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider">
          ← Home
        </Link>

        <h1 className="text-navy font-black uppercase tracking-widest text-3xl mt-6 mb-1">Records</h1>

        <div className="mt-8">
          <h2 className="text-navy font-black uppercase tracking-widest text-sm mb-4 opacity-60">Fastest Mile — Top 3</h2>

          {top3.length === 0 ? (
            <p className="text-navy opacity-40 text-sm">No mile splits recorded yet — upload a workout with laps data.</p>
          ) : (
            <div className="space-y-3">
              {top3.map((row, i) => (
                <Link key={i} href={`/dashboard/workout/${row.id}`}
                  className="flex items-center justify-between border-2 border-navy border-opacity-20 rounded-xl px-5 py-4 bg-white hover:border-gold transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{medals[i]}</span>
                    <div>
                      <p className="text-navy font-black uppercase tracking-wider text-sm">{row.name}</p>
                      <p className="text-navy opacity-40 text-xs mt-0.5">
                        {new Date(row.workout_date.split('T')[0] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {row.location ? ` · ${row.location}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gold font-black text-xl">{formatPace(row.split_s)}</p>
                    <p className="text-navy opacity-50 text-xs mt-0.5">{formatSpeed(1609.344 / row.split_s)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <StripeBar side="bottom" />
    </main>
  );
}
