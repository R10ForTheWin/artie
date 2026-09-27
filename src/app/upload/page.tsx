import Link from 'next/link';
import StripeBar from '@/components/StripeBar';
import UniversalDrop from '@/components/UniversalDrop';
import ReggieImport from '@/components/ReggieImport';
import { reggieConfig } from '@/lib/reggie';

export const dynamic = 'force-dynamic';

/**
 * The Garmin phone app can't export files, so both of these come from
 * connect.garmin.com — which works fine in a phone's browser.
 */
const OTHER_WAYS: { what: string; is: string; when: string; where: string }[] = [
  {
    what: '.gpx file',
    is: "The GPS track Garmin recorded — every point of your route.",
    when: 'Adds the real route map, the direction of each mile, and water temp.',
    where: 'connect.garmin.com → open the activity → gear icon (top right) → Export to GPX',
  },
  {
    what: 'CSV export',
    is: 'A spreadsheet of many workouts at once, summary numbers only.',
    when: 'For catching up on a whole season in one go. Anything already logged is skipped.',
    where: 'connect.garmin.com → Activities → All Activities → Export CSV (top right)',
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
            ← Dashboard
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
                <dt className="text-navy font-bold text-sm">{w.what}</dt>
                <dd className="text-navy opacity-70 text-sm leading-relaxed mt-0.5">{w.is} {w.when}</dd>
                <dd className="text-navy opacity-45 text-xs leading-relaxed mt-1">{w.where}</dd>
              </div>
            ))}
          </dl>
          <p className="text-navy opacity-40 text-xs mt-5 leading-relaxed">
            The Garmin app can&apos;t export files, so these come from connect.garmin.com. It works in your phone&apos;s browser.
          </p>
        </details>
      </div>

      <StripeBar side="bottom" />
    </main>
  );
}
