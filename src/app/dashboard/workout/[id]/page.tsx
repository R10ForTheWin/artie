import Link from 'next/link';
import { pool, initSchema } from '@/lib/db';
import { formatDate, formatDistance, formatDuration, formatSpeed, formatPace } from '@/lib/formatters';
import StripeBar from '@/components/StripeBar';
import WorkoutEditForm from '@/components/WorkoutEditForm';
import RouteMap from '@/components/RouteMap';
import CalorieCard from '@/components/CalorieCard';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Workout {
  id: number;
  name: string;
  workout_date: string;
  distance_m: number | null;
  duration_s: number | null;
  avg_speed_ms: number | null;
  avg_hr: number | null;
  location: string | null;
  mile_splits: number[] | null;
  mile_bearings: number[] | null;
  map_image_url: string | null;
  map_svg: string | null;
}

export default async function WorkoutDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mile?: string }> }) {
  const { id } = await params;
  const { mile } = await searchParams;
  const highlightMile = mile ? parseInt(mile, 10) : undefined;
  await initSchema();
  const [result, hrResult] = await Promise.all([
    pool.query('SELECT * FROM workouts WHERE id = $1', [id]),
    pool.query(
      'SELECT avg_hr, avg_speed_ms, duration_s FROM workouts WHERE avg_hr IS NOT NULL AND avg_speed_ms IS NOT NULL AND duration_s IS NOT NULL ORDER BY workout_date DESC LIMIT 30'
    ),
  ]);
  if (result.rows.length === 0) notFound();
  const w = result.rows[0] as Workout;
  const hrWorkouts = hrResult.rows as { avg_hr: number; avg_speed_ms: number; duration_s: number }[];
  const profileResult = await pool.query('SELECT weight_lbs, age FROM profiles WHERE name = $1', [w.name]);
  const athleteProfile = profileResult.rows[0] as { weight_lbs: number; age: number | null } | undefined;

  function bearingToCompass(deg: number): string {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
    const i = Math.round(deg / 45) % 8;
    return `${arrows[i]} ${dirs[i]}`;
  }

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
            ← Back
          </Link>
          <WorkoutEditForm id={w.id} name={w.name} location={w.location} workout_date={w.workout_date} />
        </div>

        <div className="mt-6 mb-2">
          <h1 className="text-navy font-black uppercase tracking-widest text-2xl">{w.name}</h1>
          <p className="text-navy opacity-40 text-sm mt-1">
            {formatDate(w.workout_date)}{w.location ? ` · ${w.location}` : ''}
          </p>
        </div>

        {/* Route map */}
        {(w.map_image_url || w.map_svg) && (
          <div className="mt-6">
            {w.map_image_url
              ? <div className="rounded-xl overflow-hidden border-2 border-navy border-opacity-20"><img src={w.map_image_url} alt="Route map" className="w-full object-cover" /></div>
              : <RouteMap svg={w.map_svg!} date={formatDate(w.workout_date)} location={w.location} distance={formatDistance(w.distance_m)} highlightMile={highlightMile} mileSplits={w.mile_splits} />
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
          <div className="col-span-2">
            <CalorieCard
              avg_speed_ms={w.avg_speed_ms}
              duration_s={w.duration_s}
              distance_m={w.distance_m}
              avg_hr={w.avg_hr}
              location={w.location}
              workout_date={w.workout_date}
              hrWorkouts={hrWorkouts}
              athleteProfile={athleteProfile ?? null}
            />
          </div>
        </div>

        {/* Mile splits */}
        {w.mile_splits && w.mile_splits.length > 0 && (
          <div className="mt-6">
            <h2 className="text-navy font-black uppercase tracking-widest text-sm mb-3">Mile Splits</h2>
            <div className="border-2 border-navy border-opacity-20 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-navy border-opacity-20 bg-white">
                    <th className="px-4 py-2 text-left text-navy font-black uppercase tracking-wider text-xs opacity-70">Mile</th>
                    <th className="px-4 py-2 text-left text-navy font-black uppercase tracking-wider text-xs opacity-70">Split</th>
                    {w.mile_bearings && <th className="px-4 py-2 text-left text-navy font-black uppercase tracking-wider text-xs opacity-70">Dir</th>}
                  </tr>
                </thead>
                <tbody>
                  {w.mile_splits.map((s, i) => {
                    const isHighlight = highlightMile === i + 1;
                    return (
                      <tr key={i} className={`border-b border-navy border-opacity-10 ${isHighlight ? 'bg-gold bg-opacity-20' : i % 2 === 0 ? 'bg-white' : 'bg-cream-light'}`}>
                        <td className={`px-4 py-2 font-bold ${isHighlight ? 'text-gold' : 'text-navy'}`}>{i + 1}</td>
                        <td className={`px-4 py-2 ${isHighlight ? 'text-gold font-bold' : 'text-navy opacity-70'}`}>{formatPace(s)}</td>
                        {w.mile_bearings && <td className={`px-4 py-2 font-mono text-xs ${isHighlight ? 'text-gold' : 'text-navy opacity-50'}`}>{w.mile_bearings[i] != null ? bearingToCompass(w.mile_bearings[i]) : '—'}</td>}
                      </tr>
                    );
                  })}
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
