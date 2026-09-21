'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TEAMMATES } from '@/lib/teammates';
import { ACTIVITY_LABELS, type Activity } from '@/lib/activity';

interface PreviewRow {
  activity: Activity;
  sport: string;
  workout_date: string;
  title: string;
  rawDistance: string;
  distance_m: number | null;
  duration_s: number | null;
}

interface Preview {
  total: number;
  toImport: PreviewRow[];
  skipped: { workout_date: string; title: string }[];
}

const miles = (m: number | null) => (m === null ? '—' : `${(m / 1609.344).toFixed(2)} mi`);

export default function GarminCsvImport() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [swimUnit, setSwimUnit] = useState<'yards' | 'meters'>('yards');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Remember who you are so the next import really is one click
  useEffect(() => {
    const saved = localStorage.getItem('artie_csv_name');
    if (saved && (TEAMMATES as readonly string[]).includes(saved)) setName(saved);
  }, []);
  useEffect(() => {
    if (name) localStorage.setItem('artie_csv_name', name);
  }, [name]);

  async function send(f: File, commit: boolean) {
    const fd = new FormData();
    fd.append('name', name);
    fd.append('file', f);
    fd.append('swimUnit', swimUnit);
    fd.append('commit', String(commit));
    const res = await fetch('/api/workouts/import-csv', { method: 'POST', body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Import failed');
    return json;
  }

  async function onPick(f: File | null) {
    setError('');
    setDone(null);
    setPreview(null);
    setFile(f);
    if (!f) return;
    if (!name) { setError('Pick who these workouts belong to first.'); return; }
    setBusy(true);
    try {
      setPreview(await send(f, false));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that CSV.');
    } finally {
      setBusy(false);
    }
  }

  async function onImport() {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const res = await send(file, true);
      setDone(res.imported);
      setPreview(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  const hasSwims = preview?.toImport.some((r) => r.activity !== 'paddle');

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-navy text-xs font-black uppercase tracking-wider opacity-50 mb-1">Whose workouts?</label>
        <select
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white border-2 border-navy text-navy rounded-lg px-4 py-3 font-semibold focus:outline-none focus:border-gold appearance-none"
        >
          <option value="">Select a name</option>
          {TEAMMATES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-navy text-xs font-black uppercase tracking-wider opacity-50 mb-1">Garmin CSV</label>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-navy file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-navy file:text-white file:font-black file:uppercase file:tracking-wider file:text-xs hover:file:bg-terracotta file:cursor-pointer cursor-pointer"
        />
      </div>

      {busy && <p className="text-navy opacity-50 text-sm">Reading…</p>}

      {error && (
        <div className="border-2 border-terracotta bg-terracotta/10 rounded-xl px-4 py-3">
          <p className="text-terracotta font-bold text-sm">{error}</p>
        </div>
      )}

      {done !== null && (
        <div className="border-2 border-green-500 bg-green-50 rounded-xl px-4 py-3">
          <p className="text-green-700 font-bold text-sm">
            Imported {done} workout{done !== 1 ? 's' : ''}.
          </p>
        </div>
      )}

      {preview && (
        <div className="border-2 border-navy/20 rounded-xl p-4 space-y-3">
          <p className="text-navy font-black uppercase tracking-widest text-sm">
            {preview.toImport.length} new · {preview.skipped.length} already in ARTIE
          </p>

          {hasSwims && (
            <div className="flex items-center gap-2">
              <span className="text-navy opacity-50 text-xs font-bold uppercase tracking-wider">Swim distances are in</span>
              {(['yards', 'meters'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => { setSwimUnit(u); if (file) { setSwimUnit(u); setTimeout(() => onPick(file), 0); } }}
                  className={`px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider transition-colors ${swimUnit === u ? 'bg-navy text-white' : 'bg-navy/10 text-navy hover:bg-navy/20'}`}
                >
                  {u}
                </button>
              ))}
            </div>
          )}

          {preview.toImport.length > 0 ? (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody>
                  {preview.toImport.map((r) => (
                    <tr key={r.workout_date + r.title} className="border-b border-navy/10 last:border-0">
                      <td className="py-1.5 pr-2 text-navy opacity-60 whitespace-nowrap">{r.workout_date}</td>
                      <td className="py-1.5 pr-2 text-navy opacity-40 text-xs">{ACTIVITY_LABELS[r.activity]}</td>
                      <td className="py-1.5 pr-2 text-navy font-semibold tabular-nums whitespace-nowrap">{miles(r.distance_m)}</td>
                      <td className="py-1.5 text-navy opacity-30 text-xs tabular-nums">({r.rawDistance})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-navy opacity-40 text-sm">Everything in this file is already in ARTIE.</p>
          )}

          {preview.toImport.length > 0 && (
            <button
              type="button"
              onClick={onImport}
              disabled={busy}
              className="w-full bg-navy text-white font-black uppercase tracking-widest py-3 rounded-lg hover:bg-terracotta transition-colors disabled:opacity-40"
            >
              {busy ? 'Importing…' : `Import ${preview.toImport.length} workout${preview.toImport.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
