import Link from 'next/link';
import { pool, initSchema } from '@/lib/db';
import { formatDate, formatDistance, formatDuration, formatSpeed, formatPace } from '@/lib/formatters';
import StripeBar from '@/components/StripeBar';
import WorkoutEditForm from '@/components/WorkoutEditForm';
import RouteMap from '@/components/RouteMap';
import CalorieCard from '@/components/CalorieCard';
import AddScreens from '@/components/AddScreens';
import { notFound } from 'next/navigation';
import type { Activity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

interface Workout {
  id: number;
  name: string;
  activity: Activity;
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
  max_speed_ms: number | null;
  max_hr: number | null;
  calories: number | null;
  start_time: string | null;
  moving_time_s: number | null;
  best_pace_s: number | null;
  total_strokes: number | null;
  avg_stroke_rate: number | null;
  max_stroke_rate: number | null;
  distance_per_stroke_ft: number | null;
  training_effect_aerobic: number | null;
  training_effect_anaerobic: number | null;
  weather_temp_f: number | null;
}

const SCREEN_ORDER = ['overview', 'stats', 'laps', 'charts', 'share', 'other'];
const SCREEN_LABEL: Record<string, string> = {
  overview: 'Overview', stats: 'Stats', laps: 'Laps', charts: 'Charts', share: 'Share card', other: 'Screenshot',
};

export default async function WorkoutDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mile?: string; span?: string }> }) {
  const { id } = await params;
  const { mile, span } = await searchParams;
  const highlightMile = mile ? parseInt(mile, 10) : undefined;
  // Records link a run of miles (?mile=4&span=3 → miles 4–6)
  const highlightSpan = Math.max(1, Math.min(10, span ? parseInt(span, 10) || 1 : 1));
  const inHighlight = (m: number) => highlightMile !== undefined && m >= highlightMile && m < highlightMile + highlightSpan;
  await initSchema();
  const [result, hrResult] = await Promise.all([
    pool.query('SELECT * FROM workouts WHERE id = $1', [id]),
    // Only chest-strap heart rate is trusted, so only it calibrates calories
    pool.query(
      `SELECT avg_hr, avg_speed_ms, duration_s FROM workouts
       WHERE avg_hr IS NOT NULL AND avg_speed_ms IS NOT NULL AND duration_s IS NOT NULL
         AND name IN (SELECT name FROM people WHERE uses_hr_monitor)
       ORDER BY workout_date DESC LIMIT 30`
    ),
  ]);
  if (result.rows.length === 0) notFound();
  const w = result.rows[0] as Workout;
  const [strapResult, screensResult] = await Promise.all([
    pool.query('SELECT uses_hr_monitor FROM people WHERE name = $1', [w.name]),
    pool.query('SELECT id, kind FROM workout_screens WHERE workout_id = $1 ORDER BY id', [w.id]),
  ]);
  // Wrist heart rate is ignored everywhere, including anything logged before the setting existed
  const wearsStrap = strapResult.rows[0]?.uses_hr_monitor === true;
  const avgHr = wearsStrap ? w.avg_hr : null;
  const screens = (screensResult.rows as { id: number; kind: string }[])
    .sort((a, b) => SCREEN_ORDER.indexOf(a.kind) - SCREEN_ORDER.indexOf(b.kind));
  const isSwim = w.activity !== 'paddle';
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

  // Extra numbers read off Garmin screenshots; each shows only when present
  const more: { label: string; value: string }[] = [
    w.moving_time_s ? { label: 'Moving time', value: formatDuration(w.moving_time_s) } : null,
    w.best_pace_s ? { label: 'Best pace', value: formatPace(w.best_pace_s) } : null,
    w.max_speed_ms ? { label: 'Max speed', value: formatSpeed(w.max_speed_ms) } : null,
    w.calories ? { label: 'Calories (Garmin)', value: w.calories.toLocaleString() } : null,
    avgHr ? { label: 'Heart rate', value: `${avgHr}${wearsStrap && w.max_hr ? ` / ${w.max_hr}` : ''} bpm` } : null,
    isSwim && w.total_strokes ? { label: 'Strokes', value: w.total_strokes.toLocaleString() } : null,
    isSwim && w.avg_stroke_rate ? { label: 'Stroke rate', value: `${w.avg_stroke_rate}${w.max_stroke_rate ? ` / ${w.max_stroke_rate}` : ''} spm` } : null,
    isSwim && w.distance_per_stroke_ft ? { label: 'Per stroke', value: `${w.distance_per_stroke_ft} ft` } : null,
    w.training_effect_aerobic != null ? { label: 'Training effect', value: `${w.training_effect_aerobic} aerobic${w.training_effect_anaerobic != null ? ` · ${w.training_effect_anaerobic} anaerobic` : ''}` } : null,
    w.weather_temp_f != null ? { label: 'Weather', value: `${Math.round(w.weather_temp_f)}°F` } : null,
  ].filter((x): x is { label: string; value: string } => x !== null);

  const missing = [
    !(w.mile_splits && w.mile_splits.length) ? 'mile splits' : null,
    !w.best_pace_s && !w.moving_time_s ? 'stats' : null,
  ].filter((x): x is string => x !== null);

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar />

      <div className="flex-1 px-6 pt-10 pb-10 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider">
            ← Back
          </Link>
          <WorkoutEditForm id={w.id} name={w.name} location={w.location} workout_date={w.workout_date} activity={w.activity} />
        </div>

        <div className="mt-6 mb-2">
          <h1 className="text-navy font-black uppercase tracking-widest text-2xl">{w.name}</h1>
          <p className="text-navy opacity-40 text-sm mt-1">
            {formatDate(w.workout_date)}{w.start_time ? ` · ${w.start_time}` : ''}{w.location ? ` · ${w.location}` : ''}
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
              avg_hr={avgHr}
              location={w.location}
              workout_date={w.workout_date}
              hrWorkouts={hrWorkouts}
              athleteProfile={athleteProfile ?? null}
            />
          </div>
        </div>

        {more.length > 0 && (
          <div className="mt-6">
            <h2 className="text-navy font-black uppercase tracking-widest text-sm mb-3">From Garmin</h2>
            <dl className="border-2 border-navy border-opacity-20 rounded-lg divide-y divide-navy/10">
              {more.map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4 px-4 py-2 text-sm">
                  <dt className="text-navy opacity-50">{label}</dt>
                  <dd className="text-navy font-bold tabular-nums text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="mt-6">
          <AddScreens workoutId={w.id} missing={missing} />
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
                    const isHighlight = inHighlight(i + 1);
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

        {screens.length > 0 && (
          <div className="mt-8">
            <h2 className="text-navy font-black uppercase tracking-widest text-sm mb-3">Screenshots</h2>
            <div className="grid grid-cols-2 gap-3">
              {screens.map((sc) => (
                <a key={sc.id} href={`/api/screens/${sc.id}`} target="_blank" rel="noopener noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/screens/${sc.id}`} alt={`${SCREEN_LABEL[sc.kind] ?? 'Screenshot'} screenshot`} loading="lazy"
                    className="w-full rounded-lg border-2 border-navy/15 aspect-[9/16] object-cover object-top" />
                  <p className="text-navy opacity-50 text-xs font-bold uppercase tracking-wider mt-1">{SCREEN_LABEL[sc.kind] ?? 'Screenshot'}</p>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <StripeBar side="bottom" />
    </main>
  );
}
