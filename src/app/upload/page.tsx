import Link from 'next/link';
import StripeBar from '@/components/StripeBar';
import UniversalDrop from '@/components/UniversalDrop';
import ReggieImport from '@/components/ReggieImport';
import { reggieConfig } from '@/lib/reggie';
import StepPath from '@/components/StepPath';

export const dynamic = 'force-dynamic';

/**
 * The Garmin phone app can't export files, so all three of these come from
 * connect.garmin.com — and downloading (or unzipping) a file is fiddly on a
 * phone, so they're marked as computer jobs.
 */
const OTHER_WAYS: { what: string; is: string; when: string; steps: string[]; note?: string }[] = [
  {
    what: '.gpx file',
    is: 'The GPS track Garmin recorded — every point of your route.',
    when: 'Adds the real route map, the direction of each mile, and water temp.',
    steps: ['connect.garmin.com', 'the activity', 'gear icon (top right)', 'Export to GPX'],
  },
  {
    what: '.fit file',
    is: "Your watch's own recording of the workout.",
    when: 'Exact numbers straight from the watch — time, distance, speed, calories and mile splits — with nothing read off a picture. More steps than screenshots, so use it if you want exact figures or already have the file.',
    steps: ['connect.garmin.com', 'the activity', 'gear icon', 'Export Original'],
    note: 'It downloads as a .zip. Unzip it and add the .fit inside.',
  },
  {
    what: 'CSV export',
    is: 'A spreadsheet of many workouts at once, summary numbers only.',
    when: 'For catching up on a whole season in one go. Anything already logged is skipped.',
    steps: ['connect.garmin.com', 'Activities', 'All Activities', 'Export CSV (top right)'],
  },
];

export default function UploadPage() {
  const reggie = reggieConfig();

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar />

      <div className="flex-1 px-6 py-10 max-w-lg mx-auto w-full">
        <div className="mb-8">
          <Link href="/dashboard" className="text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider">
            ← Mileage Tracker
          </Link>
        </div>

        <h1 className="text-navy font-black uppercase tracking-widest text-3xl mb-6">Add a Workout</h1>

        <UniversalDrop />

        {reggie && (
          <div className="mt-6">
            <ReggieImport athlete={reggie.athlete} />
          </div>
        )}

        <details className="mt-10 group border-t border-navy/10 pt-4">
          <summary className="flex items-center gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-navy opacity-60 hover:opacity-100 text-xs font-black uppercase tracking-wider">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-90">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Other ways to add
          </summary>
          <dl className="mt-4 space-y-5">
            {OTHER_WAYS.map((w) => (
              <div key={w.what}>
                <dt className="flex items-center gap-2 flex-wrap">
                  <span className="text-navy font-bold text-sm">{w.what}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-navy text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="4" y="4" width="16" height="11" rx="1.5" />
                      <path d="M2 19h20" />
                    </svg>
                    Best on a computer
                  </span>
                </dt>
                <dd className="text-navy opacity-70 text-sm leading-relaxed mt-1">{w.is} {w.when}</dd>
                <dd className="mt-2"><StepPath steps={w.steps} note={w.note} /></dd>
              </div>
            ))}
          </dl>
          <p className="text-navy opacity-40 text-xs mt-5 leading-relaxed">
            The Garmin app can&apos;t export files, so these all come from the Garmin Connect website.
          </p>
        </details>
      </div>

      <StripeBar side="bottom" />
    </main>
  );
}
