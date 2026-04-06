import Link from 'next/link';
import { pool, initSchema } from '@/lib/db';
import { TEAMMATES } from '@/lib/teammates';
import StripeBar from '@/components/StripeBar';

export const dynamic = 'force-dynamic';

export default async function StravaPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;
  await initSchema();
  const result = await pool.query('SELECT name FROM strava_tokens');
  const connected = new Set<string>(result.rows.map((r: { name: string }) => r.name));

  const importsResult = await pool.query(
    `SELECT name, file_name, workout_date, distance_m, created_at
     FROM workouts WHERE file_name LIKE 'strava-%'
     ORDER BY created_at DESC LIMIT 20`
  );
  const imports = importsResult.rows;

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar />

      <div className="flex-1 px-6 py-10 max-w-lg mx-auto w-full">
        <div className="mb-8">
          <Link href="/dashboard" className="text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider">
            ← Dashboard
          </Link>
        </div>

        <h1 className="text-navy font-black uppercase tracking-widest text-3xl mb-2">Strava Sync</h1>
        <p className="text-navy opacity-50 text-sm mb-8">
          Connect your Strava account and paddle workouts will auto-import whenever you sync your Garmin.
        </p>

        {params.connected && (
          <div className="border-2 border-green-500 bg-green-50 rounded-xl px-5 py-4 mb-6">
            <p className="text-green-700 font-bold">{decodeURIComponent(params.connected)} connected successfully!</p>
          </div>
        )}
        {params.error && (
          <div className="border-2 border-terracotta bg-red-50 rounded-xl px-5 py-4 mb-6">
            <p className="text-terracotta font-bold">Connection failed — try again.</p>
          </div>
        )}

        <div className="space-y-3">
          {TEAMMATES.map((name) => (
            <div key={name} className="flex items-center justify-between border-2 border-navy border-opacity-20 rounded-xl px-5 py-4 bg-white">
              <span className="text-navy font-black uppercase tracking-widest">{name}</span>
              {connected.has(name) ? (
                <span className="text-green-600 font-bold text-sm uppercase tracking-wider">Connected</span>
              ) : (
                <a
                  href={`/api/strava/auth?name=${encodeURIComponent(name)}`}
                  className="bg-[#FC4C02] text-white font-black uppercase tracking-wider text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Connect
                </a>
              )}
            </div>
          ))}
        </div>

        <p className="text-navy opacity-30 text-xs mt-8 leading-relaxed">
          Beta — only Prone Paddleboarding, Canoeing, Kayaking, and Rowing activities will be imported.
          Each teammate connects once; new workouts appear automatically after that.
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
