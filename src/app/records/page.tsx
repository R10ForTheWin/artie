import Link from 'next/link';
import { pool, initSchema } from '@/lib/db';
import { formatPace, formatDate } from '@/lib/formatters';
import StripeBar from '@/components/StripeBar';

export const dynamic = 'force-dynamic';

interface SplitWorkout {
  id: number;
  name: string;
  workout_date: string;
  location: string | null;
  mile_splits: number[];
}

interface Best {
  id: number;
  name: string;
  workout_date: string;
  location: string | null;
  start: number; // 1-based first mile of the stretch
  total_s: number;
}

const STRETCHES = [1, 2, 3];

/** Records need the seconds: 546 → "9:06", 3725 → "1:02:05" */
function clock(total: number): string {
  const t = Math.round(total);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
const medals = ['🥇', '🥈', '🥉'];

/** The fastest run of `n` back-to-back miles in one workout. */
function bestStretch(splits: number[], n: number): { start: number; total: number } | null {
  if (splits.length < n) return null;
  let best: { start: number; total: number } | null = null;
  for (let i = 0; i + n <= splits.length; i++) {
    const total = splits.slice(i, i + n).reduce((a, b) => a + b, 0);
    if (!best || total < best.total) best = { start: i + 1, total };
  }
  return best;
}

export default async function RecordsPage() {
  await initSchema();

  // Paddles only: a swim's or a kayak import's miles aren't comparable
  const { rows } = await pool.query<SplitWorkout>(`
    SELECT id, name, workout_date, location, mile_splits
    FROM workouts
    WHERE activity = 'paddle' AND mile_splits IS NOT NULL AND jsonb_array_length(mile_splits) > 0
  `);

  // Each board lists a workout once, so one great day can't take every medal
  const boards = STRETCHES.map((n) => {
    const bests: Best[] = [];
    for (const w of rows) {
      const splits = w.mile_splits.map(Number).filter((s) => s > 0);
      const b = bestStretch(splits, n);
      if (b) bests.push({ id: w.id, name: w.name, workout_date: w.workout_date, location: w.location, start: b.start, total_s: b.total });
    }
    return { n, top: bests.sort((a, b) => a.total_s - b.total_s).slice(0, 3) };
  });

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar />

      <div className="flex-1 px-6 pt-10 pb-10 max-w-2xl mx-auto w-full">
        <Link href="/" className="text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider">
          ← Home
        </Link>

        <h1 className="text-navy font-black uppercase tracking-widest text-3xl mt-6 mb-1">Records</h1>
        <p className="text-navy opacity-50 text-sm leading-relaxed">
          Be sure to upload .gpx files or screenshots of your splits so your records can be tracked. The web link alone
          has no split info.
        </p>

        {boards.map(({ n, top }) => (
          <div key={n} className="mt-8">
            <h2 className="text-navy font-black uppercase tracking-widest text-sm mb-4 opacity-60">
              Fastest {n} mile{n > 1 ? 's' : ''}
            </h2>
            {top.length === 0 ? (
              <p className="text-navy opacity-40 text-sm">No workouts with {n}+ mile splits yet.</p>
            ) : (
              <div className="space-y-3">
                {top.map((row, i) => (
                  <Link
                    key={row.id}
                    href={`/dashboard/workout/${row.id}?mile=${row.start}&span=${n}`}
                    className="flex items-center justify-between gap-3 border-2 border-navy border-opacity-20 rounded-xl px-5 py-4 bg-white hover:border-gold transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="text-2xl">{medals[i]}</span>
                      <div className="min-w-0">
                        <p className="text-navy font-black uppercase tracking-wider text-sm">
                          {row.name}
                          {row.location && <span className="font-bold normal-case tracking-normal opacity-60"> · {row.location}</span>}
                        </p>
                        <p className="text-navy opacity-40 text-xs mt-0.5 truncate">
                          {formatDate(row.workout_date)}
                          {n > 1 ? ` · miles ${row.start}–${row.start + n - 1}` : ` · mile ${row.start}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-gold font-black text-xl tabular-nums">{clock(row.total_s)}</p>
                      {n > 1 && <p className="text-navy opacity-50 text-xs mt-0.5 tabular-nums">{formatPace(row.total_s / n)}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <StripeBar side="bottom" />
    </main>
  );
}
