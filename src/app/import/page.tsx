import Link from 'next/link';
import StripeBar from '@/components/StripeBar';
import GarminCsvImport from '@/components/GarminCsvImport';
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

        <h1 className="text-navy font-black uppercase tracking-widest text-3xl mb-2">Garmin Import</h1>
        <p className="text-navy opacity-50 text-sm mb-8">
          Drop in a Garmin Connect CSV export and every paddle and swim in it lands in ARTIE.
          Anything already logged is skipped, so re-importing the same file is safe.
        </p>

        <GarminCsvImport />

        {reggie && (
          <div className="mt-8">
            <ReggieImport athlete={reggie.athlete} />
          </div>
        )}

        <details className="mt-10 group">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden text-navy opacity-50 hover:opacity-100 text-xs font-bold uppercase tracking-wider">
            How to get the CSV →
          </summary>
          <ol className="mt-3 space-y-1.5 text-navy opacity-60 text-sm list-decimal list-inside leading-relaxed">
            <li>Open <a href="https://connect.garmin.com/modern/activities" target="_blank" rel="noopener noreferrer" className="underline hover:text-gold">Garmin Connect → Activities</a></li>
            <li>Filter to the activities you want, and scroll so they all load</li>
            <li>Click <strong>Export CSV</strong> (top right) — it downloads automatically</li>
            <li>Come back here and pick that file</li>
          </ol>
        </details>
      </div>

      <StripeBar side="bottom" />
    </main>
  );
}
