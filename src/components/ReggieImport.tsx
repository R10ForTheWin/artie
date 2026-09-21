'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Row {
  date: string;
  name: string;
  yards: number;
  distance_m: number;
  confirmed: boolean;
}

export default function ReggieImport({ athlete }: { athlete: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<number | null>(null);

  async function call(commit: boolean) {
    const res = await fetch(`/api/workouts/import-reggie?commit=${commit}`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Reggie import failed');
    return json;
  }

  async function check() {
    setBusy(true); setError(''); setDone(null);
    try {
      const j = await call(false);
      setRows(j.toImport);
      setSkipped(j.skipped ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach Reggie.');
    } finally { setBusy(false); }
  }

  async function run() {
    setBusy(true); setError('');
    try {
      const j = await call(true);
      setDone(j.imported);
      setRows(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reggie import failed');
    } finally { setBusy(false); }
  }

  return (
    <div className="border-2 border-navy/20 rounded-xl p-5">
      <p className="text-navy font-black uppercase tracking-widest text-sm">Pool swims from Reggie</p>
      <p className="text-navy opacity-50 text-sm mt-1 mb-4 leading-relaxed">
        Pulls {athlete}&apos;s completed SCAQ practices and their yardage. Days that already have a
        workout are skipped, so your watch data always wins.
      </p>

      {error && <p className="text-terracotta font-bold text-sm mb-3">{error}</p>}

      {done !== null && (
        <p className="text-green-700 font-bold text-sm mb-3">
          Imported {done} practice{done !== 1 ? 's' : ''}.
        </p>
      )}

      {rows === null ? (
        <button
          type="button"
          onClick={check}
          disabled={busy}
          className="w-full border-2 border-navy text-navy font-black uppercase tracking-widest py-2.5 rounded-lg hover:bg-navy hover:text-white transition-colors disabled:opacity-40"
        >
          {busy ? 'Checking…' : 'Check Reggie'}
        </button>
      ) : rows.length === 0 ? (
        <p className="text-navy opacity-40 text-sm">
          Nothing new — every logged practice is already in ARTIE{skipped ? ` (${skipped} skipped)` : ''}.
        </p>
      ) : (
        <>
          <div className="max-h-56 overflow-y-auto mb-3">
            <table className="w-full text-sm">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.date} className="border-b border-navy/10 last:border-0">
                    <td className="py-1.5 pr-2 text-navy opacity-60 whitespace-nowrap">{r.date}</td>
                    <td className="py-1.5 pr-2 text-navy font-semibold tabular-nums whitespace-nowrap">
                      {r.yards.toLocaleString()} yd
                    </td>
                    <td className="py-1.5 text-navy opacity-30 text-xs">
                      {r.confirmed ? '' : 'estimated'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="w-full bg-navy text-white font-black uppercase tracking-widest py-3 rounded-lg hover:bg-terracotta transition-colors disabled:opacity-40"
          >
            {busy ? 'Importing…' : `Import ${rows.length} practice${rows.length !== 1 ? 's' : ''}`}
          </button>
        </>
      )}
    </div>
  );
}
