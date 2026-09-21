'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TEAMMATES } from '@/lib/teammates';
import { ACTIVITIES, ACTIVITY_LABELS, type Activity } from '@/lib/activity';

type Kind = 'link' | 'fit' | 'gpx' | 'csv' | 'image';

interface Item {
  id: string;
  kind: Kind;
  label: string;
  file?: File;
  url?: string;
  status: 'ready' | 'working' | 'done' | 'error';
  detail?: string;
}

const KIND_LABEL: Record<Kind, string> = {
  link: 'Garmin link',
  fit: '.fit file',
  gpx: '.gpx file',
  csv: 'CSV export',
  image: 'Screenshot',
};

const GARMIN_URL = /https?:\/\/connect\.garmin\.com\/(?:modern|app)\/activity\/\d+/;

function kindOf(file: File): Kind | null {
  const n = file.name.toLowerCase();
  if (n.endsWith('.fit')) return 'fit';
  if (n.endsWith('.gpx')) return 'gpx';
  if (n.endsWith('.csv')) return 'csv';
  if (/\.(heic|jpe?g|png|webp)$/.test(n)) return 'image';
  return null;
}

/** Only a screenshot leaves ARTIE guessing — everything else states its sport. */
const needsActivity = (items: Item[]) => items.some((i) => i.kind === 'image' || i.kind === 'gpx');

export default function UniversalDrop() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [activity, setActivity] = useState<Activity | 'auto'>('auto');
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('artie_csv_name');
    if (saved && (TEAMMATES as readonly string[]).includes(saved)) setName(saved);
  }, []);
  useEffect(() => { if (name) localStorage.setItem('artie_csv_name', name); }, [name]);

  const add = (next: Item[]) => {
    setError('');
    setItems((prev) => [...prev.filter((p) => p.status !== 'done'), ...next]);
  };

  function addFiles(list: FileList | File[]) {
    const out: Item[] = [];
    const rejected: string[] = [];
    for (const f of Array.from(list)) {
      const kind = kindOf(f);
      if (!kind) { rejected.push(f.name); continue; }
      out.push({ id: `${f.name}-${f.size}-${Math.random()}`, kind, label: f.name, file: f, status: 'ready' });
    }
    if (rejected.length) setError(`Not sure what to do with ${rejected.join(', ')}`);
    if (out.length) add(out);
  }

  function addText(text: string) {
    const m = text.match(GARMIN_URL);
    if (!m) { setError('That does not look like a Garmin activity link.'); return; }
    add([{ id: m[0], kind: 'link', label: m[0].replace(/^https?:\/\//, ''), url: m[0], status: 'ready' }]);
  }

  async function send(item: Item): Promise<{ ok: boolean; detail: string }> {
    const fd = new FormData();
    fd.append('name', name);
    if (activity !== 'auto') fd.append('activity', activity);

    if (item.kind === 'csv') {
      fd.append('file', item.file!);
      fd.append('commit', 'true');
      const res = await fetch('/api/workouts/import-csv', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) return { ok: false, detail: j.error ?? 'failed' };
      return { ok: true, detail: `${j.imported} added, ${j.skipped} already there` };
    }

    if (item.kind === 'link') fd.append('garminUrl', item.url!);
    else fd.append('file', item.file!);

    const res = await fetch('/api/workouts', { method: 'POST', body: fd });
    const j = await res.json();
    if (!res.ok) return { ok: false, detail: j.error ?? 'failed' };
    return { ok: true, detail: j.workout_date?.slice(0, 10) ?? 'added' };
  }

  async function run() {
    if (!name) { setError('Pick your name first.'); return; }
    setBusy(true);
    setError('');
    for (const item of items) {
      if (item.status === 'done') continue;
      setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'working' } : p)));
      let out: { ok: boolean; detail: string };
      try { out = await send(item); }
      catch { out = { ok: false, detail: 'upload failed' }; }
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, status: out.ok ? 'done' : 'error', detail: out.detail } : p))
      );
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
    router.refresh();
  }

  const pending = items.filter((i) => i.status !== 'done').length;

  return (
    <div
      className="space-y-4"
      onPaste={(e) => {
        const text = e.clipboardData.getData('text');
        const files = Array.from(e.clipboardData.files);
        if (files.length) { e.preventDefault(); addFiles(files); }
        else if (text.trim()) { e.preventDefault(); addText(text); }
      }}
    >
      <select
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-white border-2 border-navy text-navy rounded-lg px-4 py-3 font-semibold focus:outline-none focus:border-gold appearance-none"
      >
        <option value="">Who is this?</option>
        {TEAMMATES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>

      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          else {
            const text = e.dataTransfer.getData('text');
            if (text) addText(text);
          }
        }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed px-5 py-8 text-center cursor-pointer transition-colors ${
          over ? 'border-gold bg-gold/10' : 'border-navy/30 hover:border-navy/60 bg-navy/[0.02]'
        }`}
      >
        <p className="text-navy font-black uppercase tracking-widest text-sm">Drop it here</p>
        <p className="text-navy opacity-50 text-sm mt-1">or tap to pick a file · paste a link</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".fit,.gpx,.csv,.heic,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* Paste target for phones, where onPaste on a div is unreliable */}
      <input
        type="text"
        inputMode="url"
        placeholder="…or paste a Garmin link here"
        onChange={(e) => { if (GARMIN_URL.test(e.target.value)) { addText(e.target.value); e.target.value = ''; } }}
        className="w-full bg-white border-2 border-navy/20 text-navy rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold"
      />

      {error && <p className="text-terracotta font-bold text-sm">{error}</p>}

      {needsActivity(items) && (
        <div>
          <label className="block text-navy text-xs font-black uppercase tracking-wider opacity-50 mb-1">
            What was it? (screenshots can&apos;t say)
          </label>
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value as Activity | 'auto')}
            className="w-full bg-white border-2 border-navy text-navy rounded-lg px-4 py-2.5 font-semibold text-sm focus:outline-none focus:border-gold appearance-none"
          >
            <option value="auto">Work it out</option>
            {ACTIVITIES.map((a) => <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>)}
          </select>
        </div>
      )}

      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 text-sm border-b border-navy/10 pb-1.5 last:border-0">
              <span className="min-w-0 flex-1 truncate text-navy">
                <span className="opacity-40 text-xs uppercase tracking-wider mr-2">{KIND_LABEL[i.kind]}</span>
                {i.label}
              </span>
              <span className={`shrink-0 text-xs font-bold ${
                i.status === 'done' ? 'text-green-700' : i.status === 'error' ? 'text-terracotta' : 'text-navy opacity-40'
              }`}>
                {i.status === 'working' ? '…' : i.detail ?? (i.status === 'ready' ? 'ready' : '')}
              </span>
            </li>
          ))}
        </ul>
      )}

      {pending > 0 && (
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="w-full bg-navy text-white font-black uppercase tracking-widest py-3 rounded-lg hover:bg-terracotta transition-colors disabled:opacity-40"
        >
          {busy ? 'Adding…' : `Add ${pending} workout${pending !== 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
}
