import Link from 'next/link';
import StripeBar from '@/components/StripeBar';
import GarminCsvImport from '@/components/GarminCsvImport';
import FitUpload from '@/components/FitUpload';
import ReggieImport from '@/components/ReggieImport';
import { reggieConfig } from '@/lib/reggie';

export const dynamic = 'force-dynamic';

export default function ImportPage() {
  // Reggie's tally is keyed to one swimmer, so this only appears when configured
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

        <h1 className="text-navy font-black uppercase tracking-widest text-3xl mb-2">Add Workouts</h1>
        <p className="text-navy opacity-50 text-sm mb-8">
          Two ways in — a whole season at once from a CSV, or one workout at a time from your phone.
          Either way, anything already logged is skipped, so nothing doubles up.
        </p>

        {/* Batch route */}
        <div className="border-2 border-navy/20 rounded-xl p-5 space-y-4 mb-5">
          <div>
            <p className="text-navy font-black uppercase tracking-widest text-sm">Many at once</p>
            <p className="text-navy opacity-50 text-sm mt-1 leading-relaxed">
              A Garmin CSV export. Best for catching up on a season. Needs a computer —
              the Garmin phone app can&apos;t export CSV.
            </p>
          </div>
          <GarminCsvImport />
        </div>

        {/* Phone route */}
        <FitUpload />

        {reggie && (
          <div className="mt-5">
            <ReggieImport athlete={reggie.athlete} />
          </div>
        )}

        <details className="mt-8 group">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden text-navy opacity-50 hover:opacity-100 text-xs font-black uppercase tracking-wider">
            How to get a Garmin CSV →
          </summary>
          <ol className="mt-3 space-y-2 text-navy opacity-60 text-sm list-decimal list-inside leading-relaxed">
            <li>On a computer, open <a href="https://connect.garmin.com/modern/activities" target="_blank" rel="noopener noreferrer" className="underline hover:text-gold">Garmin Connect → Activities</a></li>
            <li>
              <strong className="text-navy opacity-100">Scroll to the bottom until every workout you want has loaded.</strong>{' '}
              Garmin only exports what is on screen, so without this you get about
              twenty activities instead of your season.
            </li>
            <li>Click <strong>Export CSV</strong> at the top right</li>
            <li>Come back here and pick that file</li>
          </ol>
        </details>

        <details className="mt-3 group">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden text-navy opacity-50 hover:opacity-100 text-xs font-black uppercase tracking-wider">
            How to get a .fit file →
          </summary>
          <ol className="mt-3 space-y-2 text-navy opacity-60 text-sm list-decimal list-inside leading-relaxed">
            <li>
              <strong className="text-navy opacity-100">The Garmin app can&apos;t do this</strong> — it
              exports no files at all. Use the website, which works in your phone&apos;s browser too.
            </li>
            <li>Open <a href="https://connect.garmin.com/modern/activities" target="_blank" rel="noopener noreferrer" className="underline hover:text-gold">connect.garmin.com</a> and tap the activity</li>
            <li>Tap the <strong>gear icon</strong> at the top right, then <strong>Export Original</strong></li>
            <li>Save the file, then pick it above</li>
          </ol>
          <p className="mt-2 text-navy opacity-40 text-xs leading-relaxed">
            Only worth the trouble if you want heart rate and mile splits. Otherwise pasting the
            activity link on the upload page is far quicker.
          </p>
        </details>
      </div>

      <StripeBar side="bottom" />
    </main>
  );
}
