import Link from 'next/link';
import { pool } from '@/lib/db';
import { formatDuration, formatDate } from '@/lib/formatters';

/**
 * Course records (Topaz → R10, Mothers Beach → Venice, Anacapa loop), taken off
 * the Records page on 2026-09-27 and kept here to bring back later.
 *
 * Known problems to fix first: courses are matched on the typed location only;
 * distances have a minimum but no maximum; the rest at R10 counts against .fit,
 * .gpx and Strava workouts (they store elapsed time) but not linked ones
 * (timer time). The plan was a Course tag on each workout, distance windows,
 * and ranking by the watch's timer time.
 */

interface TopazRow {
  id: number;
  name: string;
  workout_date: string;
  location: string | null;
  duration_s: number;
  distance_m: number;
}

export default async function CourseRecords() {
  // Top 3 fastest ~10 mile Topaz workouts by duration
  const topazResult = await pool.query<TopazRow>(`
    SELECT id, name, workout_date, location, duration_s, distance_m
    FROM workouts
    WHERE LOWER(location) LIKE '%topaz%'
      AND distance_m >= 14000
      AND duration_s IS NOT NULL
    ORDER BY duration_s ASC
    LIMIT 3
  `);
  const topaz3 = topazResult.rows;

  // Top 3 fastest Mothers Beach → Venice Pier & Back workouts by duration
  const mdrResult = await pool.query<TopazRow>(`
    SELECT id, name, workout_date, location, duration_s, distance_m
    FROM workouts
    WHERE LOWER(location) LIKE '%mdr%'
      AND distance_m >= 8000
      AND duration_s IS NOT NULL
    ORDER BY duration_s ASC
    LIMIT 3
  `);
  const mdr3 = mdrResult.rows;

  // Top 3 fastest Oxnard to Anacapa Loop workouts by duration
  const anacapaResult = await pool.query<TopazRow>(`
    SELECT id, name, workout_date, location, duration_s, distance_m
    FROM workouts
    WHERE (LOWER(location) LIKE '%anacapa%' OR LOWER(location) LIKE '%oxnard%')
      AND distance_m >= 30000
      AND duration_s IS NOT NULL
    ORDER BY duration_s ASC
    LIMIT 3
  `);
  const anacapa3 = anacapaResult.rows;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <>
        <div className="mt-10">
          <h2 className="text-navy font-black uppercase tracking-widest text-sm mb-1 opacity-60">Fastest Topaz Jetty → R10 → Back</h2>
          <p className="text-navy opacity-30 text-xs mb-3">~10 mi · excludes mid-paddle break</p>
          <div className="rounded-xl overflow-hidden border-2 border-navy border-opacity-10 mb-4">
            <img src="/courses/topaz-r10.png" alt="Topaz Jetty to R10 course map" className="w-full" />
          </div>

          {topaz3.length === 0 ? (
            <p className="text-navy opacity-40 text-sm">No qualifying workouts yet.</p>
          ) : (
            <div className="space-y-3">
              {topaz3.map((row, i) => (
                <Link key={i} href={`/dashboard/workout/${row.id}`}
                  className="flex items-center justify-between border-2 border-navy border-opacity-20 rounded-xl px-5 py-4 bg-white hover:border-gold transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{medals[i]}</span>
                    <div>
                      <p className="text-navy font-black uppercase tracking-wider text-sm">{row.name}</p>
                      <p className="text-navy opacity-40 text-xs mt-0.5">
                        {formatDate(row.workout_date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gold font-black text-xl">{formatDuration(row.duration_s)}</p>
                    <p className="text-navy opacity-50 text-xs mt-0.5">{(row.distance_m * 0.000621371).toFixed(2)} mi</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="mt-10">
          <h2 className="text-navy font-black uppercase tracking-widest text-sm mb-1 opacity-60">Fastest Mothers Beach → Venice Pier &amp; Back</h2>
          <p className="text-navy opacity-30 text-xs mb-3">~6 mi</p>
          <div className="rounded-xl overflow-hidden border-2 border-navy border-opacity-10 mb-4">
            <img src="/courses/mdr-venice.png" alt="Mothers Beach to Venice Pier course map" className="w-full" />
          </div>

          {mdr3.length === 0 ? (
            <p className="text-navy opacity-40 text-sm">No qualifying workouts yet — be the first!</p>
          ) : (
            <div className="space-y-3">
              {mdr3.map((row, i) => (
                <Link key={i} href={`/dashboard/workout/${row.id}`}
                  className="flex items-center justify-between border-2 border-navy border-opacity-20 rounded-xl px-5 py-4 bg-white hover:border-gold transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{medals[i]}</span>
                    <div>
                      <p className="text-navy font-black uppercase tracking-wider text-sm">{row.name}</p>
                      <p className="text-navy opacity-40 text-xs mt-0.5">
                        {formatDate(row.workout_date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gold font-black text-xl">{formatDuration(row.duration_s)}</p>
                    <p className="text-navy opacity-50 text-xs mt-0.5">{(row.distance_m * 0.000621371).toFixed(2)} mi</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="mt-10">
          <h2 className="text-navy font-black uppercase tracking-widest text-sm mb-1 opacity-60">Fastest Oxnard to Anacapa Loop</h2>
          <p className="text-navy opacity-30 text-xs mb-3">~25 mi</p>
          <div className="rounded-xl overflow-hidden border-2 border-navy border-opacity-10 mb-4">
            <img src="/courses/anacapa-loop.png" alt="Oxnard to Anacapa Loop course map" className="w-full" />
          </div>

          {anacapa3.length === 0 ? (
            <p className="text-navy opacity-40 text-sm">No qualifying workouts yet — be the first!</p>
          ) : (
            <div className="space-y-3">
              {anacapa3.map((row, i) => (
                <Link key={i} href={`/dashboard/workout/${row.id}`}
                  className="flex items-center justify-between border-2 border-navy border-opacity-20 rounded-xl px-5 py-4 bg-white hover:border-gold transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{medals[i]}</span>
                    <div>
                      <p className="text-navy font-black uppercase tracking-wider text-sm">{row.name}</p>
                      <p className="text-navy opacity-40 text-xs mt-0.5">
                        {formatDate(row.workout_date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gold font-black text-xl">{formatDuration(row.duration_s)}</p>
                    <p className="text-navy opacity-50 text-xs mt-0.5">{(row.distance_m * 0.000621371).toFixed(2)} mi</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
    </>
  );
}
