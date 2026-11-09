import Link from 'next/link';
import { pool, initSchema } from '@/lib/db';
import { TEAMMATES } from '@/lib/teammates';
import { cookies } from 'next/headers';
import { sessionName } from '@/lib/auth';
import StripeBar from '@/components/StripeBar';

export const dynamic = 'force-dynamic';

const RESULT_TEXT: Record<string, string> = {
  connected: 'Strava connected. Your recent paddles and swims are coming in now.',
  denied: 'Strava was not connected. Tap Connect again when you are ready.',
  scope: 'ARTIE needs to see your activities. Tap Connect again and leave the activities box checked.',
  taken: 'That Strava account is already connected to a different teammate.',
  failed: 'Something went wrong connecting Strava. Try again.',
};

export default async function StravaPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const params = await searchParams;
  await initSchema();
  const result = await pool.query('SELECT name FROM strava_tokens');
  const connected = new Set<string>(result.rows.map((r: { name: string }) => r.name));
  // Original crew first, then anyone who added themselves
  const peopleResult = await pool.query('SELECT name FROM people ORDER BY LOWER(name)');
  const roster = [
    ...TEAMMATES,
    ...(peopleResult.rows as { name: string }[]).map((p) => p.name).filter((n) => !(TEAMMATES as readonly string[]).includes(n)),
  ];

  const importsResult = await pool.query(
    `SELECT name, file_name, workout_date, distance_m, created_at
     FROM workouts WHERE file_name LIKE 'strava-%'
     ORDER BY created_at DESC LIMIT 20`
  );
  const imports = importsResult.rows;

  const me = await sessionName({ cookies: await cookies() });
  const meConnected = me ? connected.has(me) : false;

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar />

      <div className="flex-1 px-6 py-10 max-w-lg mx-auto w-full">
        <div className="mb-8">
          <Link href="/dashboard" className="text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider">
            ← Mileage Tracker
          </Link>
        </div>

        <h1 className="text-navy font-black uppercase tracking-widest text-3xl mb-2">Strava Sync</h1>
        <p className="text-navy opacity-50 text-sm mb-8">
          Connect once and every paddle or swim you save to Strava shows up here on its own.
        </p>

        {params.result && RESULT_TEXT[params.result] && (
          <div
            className={`border-2 rounded-xl px-5 py-4 mb-6 ${params.result === 'connected' ? 'border-green-500 bg-green-50' : 'border-terracotta bg-red-50'}`}
          >
            <p className={`font-bold ${params.result === 'connected' ? 'text-green-700' : 'text-terracotta'}`}>
              {RESULT_TEXT[params.result]}
            </p>
          </div>
        )}

        {me && (
          <div className="border-2 border-navy/20 rounded-xl px-5 py-5 mb-8 bg-white">
            {meConnected ? (
              <>
                <p className="text-navy font-black uppercase tracking-widest">You&apos;re connected</p>
                <p className="text-navy opacity-60 text-sm mt-1">
                  Save a paddle or swim in Strava and it lands in ARTIE within a minute or so.
                </p>
              </>
            ) : (
              <>
                <a
                  href="/api/strava/auth"
                  className="block w-full text-center bg-[#FC4C02] text-white font-black uppercase tracking-wider text-base px-4 py-4 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Connect my Strava
                </a>
                <p className="text-navy opacity-50 text-xs mt-3 leading-relaxed">
                  Strava opens and asks to allow ARTIE. Tap Authorize and you&apos;re done.
                  Everything since the season started comes in right away.
                </p>
              </>
            )}
          </div>
        )}

        <h2 className="text-navy font-black uppercase tracking-widest text-sm mb-3">Crew</h2>
        <div className="space-y-2">
          {roster.map((name) => (
            <div key={name} className="flex items-center justify-between border border-navy/15 rounded-lg px-4 py-3 bg-white">
              <span className="text-navy font-bold uppercase tracking-wider text-sm">{name}</span>
              {connected.has(name) ? (
                <span className="text-green-600 font-bold text-xs uppercase tracking-wider">Connected</span>
              ) : (
                <span className="text-navy opacity-30 text-xs uppercase tracking-wider">Not yet</span>
              )}
            </div>
          ))}
        </div>

        <p className="text-navy opacity-30 text-xs mt-8 leading-relaxed">
          Imports paddles (prone, SUP, canoe, kayak, rowing) and swims. You can still add workouts on the{' '}
          <Link href="/upload" className="underline">upload page</Link>; ARTIE won&apos;t double them up.
        </p>

        {/* Recent Strava imports */}
        <div className="mt-10">
          <h2 className="text-navy font-black uppercase tracking-widest text-sm mb-4">Recent Strava Imports</h2>
          {imports.length === 0 ? (
            <p className="text-navy opacity-30 text-sm">No Strava imports yet.</p>
          ) : (
            <div className="space-y-2">
              {imports.map((row: { name: string; file_name: string; workout_date: string; distance_m: number | null; created_at: string }) => (
                <div key={row.file_name} className="flex items-center justify-between border border-navy border-opacity-10 rounded-lg px-4 py-3 bg-white text-sm">
                  <div>
                    <span className="text-navy font-bold">{row.name}</span>
                    <span className="text-navy opacity-40 mx-2">·</span>
                    <span className="text-navy opacity-60">{row.workout_date}</span>
                    {row.distance_m && (
                      <>
                        <span className="text-navy opacity-40 mx-2">·</span>
                        <span className="text-gold font-bold">{(row.distance_m * 0.000621371).toFixed(2)} mi</span>
                      </>
                    )}
                  </div>
                  <span className="text-navy opacity-30 text-xs">
                    {new Date(row.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <StripeBar side="bottom" />
    </main>
  );
}
