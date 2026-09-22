import Link from 'next/link';
import StripeBar from '@/components/StripeBar';
import UniversalDrop from '@/components/UniversalDrop';
import ReggieImport from '@/components/ReggieImport';
import { reggieConfig } from '@/lib/reggie';

export const dynamic = 'force-dynamic';

const SOURCES: { what: string; where: string; gets: string; badge?: 'easiest' | 'most data' }[] = [
  {
    what: "Garmin's share picture",
    where: 'Garmin app → the activity → Share → Copy, then paste it here',
    gets: 'Distance, time and the sport, read straight off the card',
    badge: 'easiest',
  },
  {
    what: 'Garmin link',
    where: 'connect.garmin.com → the activity → copy the address bar',
    gets: 'Distance, time, average speed and a map thumbnail',
  },
  {
    what: '.gpx file — for paddles and ocean swims',
    where: 'connect.garmin.com → the activity → Export to GPX',
    gets: 'Everything — heart rate, mile splits, route map, bearings and water temp',
    badge: 'most data',
  },
  {
    what: '.fit file — for pool swims',
    where: 'connect.garmin.com → the activity → gear icon → Export Original',
    gets: 'Heart rate, laps and calories. Use this in the pool — a .gpx has no distance without GPS',
  },
  {
    what: 'CSV export',
    where: 'connect.garmin.com → Activities → Export CSV',
    gets: 'A whole season at once — distance, time, calories and location',
  },
  {
    what: 'Screenshot of your workout',
    where: 'A photo of your watch or the Garmin app',
    gets: 'Whatever is on screen — usually distance, time and pace',
  },
];

const BADGE_STYLE: Record<'easiest' | 'most data', string> = {
  easiest: 'bg-gold/20 text-gold',
  'most data': 'bg-sky/20 text-sky',
};

export default function UploadPage() {
  const reggie = reggieConfig();

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar />

      <div className="flex-1 px-6 py-10 max-w-lg mx-auto w-full">
        <div className="mb-8">
          <Link href="/dashboard" className="text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider">
            ← Dashboard
          </Link>
        </div>

        <h1 className="text-navy font-black uppercase tracking-widest text-3xl mb-2">Add a Workout</h1>
        <p className="text-navy opacity-50 text-sm mb-6">
          Drop in whatever you have and ARTIE works out what it is. Anything already logged is
          skipped, so you can&apos;t double up.
        </p>

        <UniversalDrop />

        {reggie && (
          <div className="mt-6">
            <ReggieImport athlete={reggie.athlete} />
          </div>
        )}

        <div className="mt-10">
          <p className="text-navy opacity-40 text-xs font-black uppercase tracking-wider mb-3">
            What it takes, and where to find it
          </p>
          <dl className="space-y-4">
            {SOURCES.map((s) => (
              <div key={s.what}>
                <dt className="flex items-center gap-2 flex-wrap">
                  <span className="text-navy font-bold text-sm">{s.what}</span>
                  {s.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${BADGE_STYLE[s.badge]}`}>
                      {s.badge}
                    </span>
                  )}
                </dt>
                <dd className="text-navy opacity-60 text-sm leading-relaxed mt-0.5">{s.gets}</dd>
                <dd className="text-navy opacity-40 text-xs leading-relaxed mt-0.5">{s.where}</dd>
              </div>
            ))}
          </dl>
          <p className="text-navy opacity-40 text-xs mt-4 leading-relaxed">
            connect.garmin.com works in your phone&apos;s browser too.
          </p>
        </div>
      </div>

      <StripeBar side="bottom" />
    </main>
  );
}
