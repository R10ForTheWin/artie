import Link from 'next/link';
import { pool, initSchema } from '@/lib/db';
import { formatDate, formatDistance, formatDuration, formatSpeed, formatPace } from '@/lib/formatters';
import StripeBar from '@/components/StripeBar';
import DeleteWorkoutButton from '@/components/DeleteWorkoutButton';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Workout {
  id: number;
  name: string;
  workout_date: string;
  distance_m: number | null;
  duration_s: number | null;
  avg_speed_ms: number | null;
  location: string | null;
  mile_splits: number[] | null;
  map_image_url: string | null;
  map_svg: string | null;
}

export default async function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await initSchema();
  const result = await pool.query('SELECT * FROM workouts WHERE id = $1', [id]);
  if (result.rows.length === 0) notFound();
  const w = result.rows[0] as Workout;

  const stats = [
    { label: 'Distance', value: formatDistance(w.distance_m) },
    { label: 'Duration', value: formatDuration(w.duration_s) },
    { label: 'Avg Speed', value: formatSpeed(w.avg_speed_ms) },
    { label: 'Pace', value: formatPace(w.avg_speed_ms ? 1609.344 / w.avg_speed_ms : null) },
  ];

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar />

      <div className="flex-1 px-6 pt-10 pb-10 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider">
            ← Dashboard
          </Link>
          <DeleteWorkoutButton id={w.id} redirectTo="/dashboard" />
        </div>

        <div className="mt-6 mb-2">
          <h1 className="text-navy font-black uppercase tracking-widest text-2xl">{w.name}</h1>
          <p className="text-navy opacity-40 text-sm mt-1">
            {formatDate(w.workout_date)}{w.location ? ` · ${w.location}` : ''}
          </p>
        </div>

        {/* Route map */}
        {(w.map_image_url || w.map_svg) && (
          <div className="mt-6 rounded-xl overflow-hidden border-2 border-navy border-opacity-20 bg-cream-light">
            {w.map_image_url
              ? <img src={w.map_image_url} alt="Route map" className="w-full object-cover" />
              : <div className="p-4" dangerouslySetInnerHTML={{ __html: w.map_svg! }} />
            }
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          {stats.map(({ label, value }) => (
            <div key={label} className="border-2 border-navy border-opacity-20 rounded-lg p-4 bg-white">
              <p className="text-navy text-xs uppercase tracking-wider opacity-50 mb-1">{label}</p>
              <p className="text-gold font-bold text-xl">{value}</p>
            </div>
          ))}
        </div>

        {/* Mile splits */}
        {w.mile_splits && w.mile_splits.length > 0 && (
          <div className="mt-6">
            <h2 className="text-navy font-black uppercase tracking-widest text-sm mb-3">Mile Splits</h2>
            <div className="border-2 border-navy border-opacity-20 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-navy border-opacity-20 bg-cream-light">
                    <th className="px-4 py-2 text-left text-navy font-black uppercase tracking-wider text-xs opacity-70">Mile</th>
                    <th className="px-4 py-2 text-left text-navy font-black uppercase tracking-wider text-xs opacity-70">Split</th>
                  </tr>
                </thead>
                <tbody>
                  {w.mile_splits.map((s, i) => (
                    <tr key={i} className={`border-b border-navy border-opacity-10 ${i % 2 === 0 ? 'bg-white' : 'bg-cream-light'}`}>
                      <td className="px-4 py-2 text-navy font-bold">{i + 1}</td>
                      <td className="px-4 py-2 text-navy opacity-70">{formatPace(s)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <StripeBar side="bottom" />
    </main>
  );
}
