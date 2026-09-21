'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TEAMMATES } from '@/lib/teammates';
import { ACTIVITIES, ACTIVITY_LABELS, type Activity } from '@/lib/activity';

interface Result {
  file: string;
  ok: boolean;
  detail: string;
}

/**
 * The richest data ARTIE can take: a FIT carries heart rate and mile splits,
 * which a pasted Garmin link cannot (that only scrapes distance, time and speed).
 * The catch is that the Garmin mobile app exports no files at all — the file has
 * to come from connect.garmin.com, which does at least work in a phone browser.
 */
export default function FitUpload() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [activity, setActivity] = useState<Activity>('paddle');
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('artie_csv_name');
    if (saved && (TEAMMATES as readonly string[]).includes(saved)) setName(saved);
  }, []);
  useEffect(() => {
    if (name) localStorage.setItem('artie_csv_name', name);
  }, [name]);

  async function upload() {
    if (!name) { setError('Pick who these workouts belong to first.'); return; }
    if (files.length === 0) return;
    setBusy(true);
    setError('');
    const out: Result[] = [];
    for (const f of files) {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('activity', activity);
      fd.append('file', f);
      try {
        const res = await fetch('/api/workouts', { method: 'POST', body: fd });
        const json = await res.json();
        out.push(
          res.ok
            ? { file: f.name, ok: true, detail: json.workout_date ?? 'added' }
            : { file: f.name, ok: false, detail: json.error ?? 'failed' }
        );
      } catch {
        out.push({ file: f.name, ok: false, detail: 'upload failed' });
      }
      setResults([...out]);
    }
    setBusy(false);
    setFiles([]);
    if (inputRef.current) inputRef.current.value = '';
    router.refresh();
  }

  return (
    <div className="border-2 border-navy/20 rounded-xl p-5 space-y-4">
      <div>
        <p className="text-navy font-black uppercase tracking-widest text-sm">One workout at a time</p>
        <p className="text-navy opacity-50 text-sm mt-1 leading-relaxed">
          A <strong>.fit</strong> file carries heart rate and mile splits, which neither the CSV nor a
          pasted link can. It comes from the Garmin website, not the app — see below.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-white border-2 border-navy text-navy rounded-lg px-3 py-2.5 font-semibold text-sm focus:outline-none focus:border-gold appearance-none"
        >
          <option value="">Your name</option>
          {TEAMMATES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={activity}
          onChange={(e) => setActivity(e.target.value as Activity)}
          className="bg-white border-2 border-navy text-navy rounded-lg px-3 py-2.5 font-semibold text-sm focus:outline-none focus:border-gold appearance-none"
        >
          {ACTIVITIES.map((a) => <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>)}
        </select>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".fit,.gpx"
        multiple
        onChange={(e) => { setResults([]); setError(''); setFiles(Array.from(e.target.files ?? [])); }}
        className="w-full text-sm text-navy file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-navy file:text-white file:font-black file:uppercase file:tracking-wider file:text-xs hover:file:bg-terracotta file:cursor-pointer cursor-pointer"
      />

      {error && <p className="text-terracotta font-bold text-sm">{error}</p>}

      {files.length > 0 && (
        <button
          type="button"
          onClick={upload}
          disabled={busy}
          className="w-full bg-navy text-white font-black uppercase tracking-widest py-3 rounded-lg hover:bg-terracotta transition-colors disabled:opacity-40"
        >
          {busy ? 'Uploading…' : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
        </button>
      )}

      {results.length > 0 && (
        <ul className="space-y-1 text-sm">
          {results.map((r) => (
            <li key={r.file} className={r.ok ? 'text-green-700' : 'text-terracotta'}>
              {r.ok ? '✓' : '✗'} {r.file} — {r.detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
