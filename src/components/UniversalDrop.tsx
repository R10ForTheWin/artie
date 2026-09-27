'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TEAMMATES } from '@/lib/teammates';
import { ACTIVITIES, ACTIVITY_LABELS, classifyActivity, type Activity } from '@/lib/activity';

/**
 * One box for everything. A Garmin link and any Garmin app screenshots become a
 * single workout — people pick all their screenshots at once, in any order, and
 * each is read as it arrives so they can see what ARTIE found before saving.
 * Files (.fit, .gpx, .csv) still add workouts of their own.
 */

type ScreenKind = 'overview' | 'stats' | 'laps' | 'charts' | 'share' | 'other';

interface Fields {
  workout_date?: string | null;
  title?: string | null;
  sport?: string | null;
  distance_m?: number | null;
  duration_s?: number | null;
  calories?: number | null;
  avg_hr?: number | null;
  best_pace_s?: number | null;
  total_strokes?: number | null;
  mile_splits?: number[] | null;
  training_effect_aerobic?: number | null;
  weather_temp_f?: number | null;
  map_image_url?: string | null;
}

interface LinkPiece {
  url: string;
  status: 'reading' | 'ok' | 'error';
  read?: { activityId: string; title: string | null } & Fields;
  summary?: string;
}

interface ScreenPiece {
  id: string;
  file: File;
  status: 'reading' | 'ok' | 'error';
  kind?: ScreenKind;
  fields?: Fields;
  summary?: string;
}

type FileKind = 'fit' | 'gpx' | 'csv';
interface FileItem {
  id: string;
  kind: FileKind;
  file: File;
  status: 'ready' | 'working' | 'done' | 'error';
  detail?: string;
}

const KIND_LABEL: Record<ScreenKind, string> = {
  overview: 'Overview',
  stats: 'Stats',
  laps: 'Laps',
  charts: 'Charts',
  share: 'Share card',
  other: 'Not a Garmin screen',
};

const FILE_LABEL: Record<FileKind, string> = { fit: '.fit file', gpx: '.gpx file', csv: 'CSV export' };

// Garmin shares activity links in several shapes — with or without /modern/ or
// /app/, with or without the scheme, and wrapped in "Check out my…" text.
const GARMIN_URL = /(?:https?:\/\/)?(?:www\.)?connect\.garmin\.com\/(?:modern\/|app\/)?activity\/\d+/i;
const findLink = (text: string) => {
  const g = text.match(GARMIN_URL);
  return g ? (g[0].startsWith('http') ? g[0] : `https://${g[0]}`) : null;
};

const isImage = (f: File) => /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name) || f.type.startsWith('image/');
function fileKind(f: File): FileKind | null {
  const n = f.name.toLowerCase();
  if (n.endsWith('.fit')) return 'fit';
  if (n.endsWith('.gpx')) return 'gpx';
  if (n.endsWith('.csv')) return 'csv';
  return null;
}

const clock = (s: number | null | undefined) => {
  if (!s) return null;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.round(s % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

const ORDER: (ScreenKind | 'link')[] = ['link', 'overview', 'stats', 'laps', 'charts', 'share'];

export default function UniversalDrop() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const [roster, setRoster] = useState<string[]>([...TEAMMATES]);
  const [wearsStrap, setWearsStrap] = useState(false);
  const [activity, setActivity] = useState<Activity | 'auto'>('auto');

  const [link, setLink] = useState<LinkPiece | null>(null);
  const [screens, setScreens] = useState<ScreenPiece[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [linkText, setLinkText] = useState('');
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ id: number; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Signed in? Then that is who this is, and the picker is just noise.
    fetch('/api/auth')
      .then((r) => r.json())
      .then((d: { me: string | null; people: { name: string }[]; usesHrMonitor?: boolean }) => {
        if (d.people?.length) setRoster(d.people.map((p) => p.name));
        setWearsStrap(Boolean(d.usesHrMonitor));
        if (d.me) { setSignedInAs(d.me); setName(d.me); return; }
        try { const saved = localStorage.getItem('artie_csv_name'); if (saved) setName(saved); } catch { /* private mode */ }
      })
      .catch(() => {});
  }, []);
  useEffect(() => { try { if (name) localStorage.setItem('artie_csv_name', name); } catch { /* private mode */ } }, [name]);

  function reset() {
    setLink(null); setScreens([]); setFiles([]); setActivity('auto'); setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  function startNew() { setDone(null); setError(''); }

  function addLink(text: string) {
    const url = findLink(text);
    if (!url) {
      const snippet = text.trim().slice(0, 60);
      setError(`That does not look like a Garmin activity link${snippet ? ` — got "${snippet}${text.trim().length > 60 ? '…' : ''}"` : ''}.`);
      return;
    }
    startNew();
    setLink({ url, status: 'reading' });
    const fd = new FormData();
    fd.append('garminUrl', url);
    fetch('/api/workouts/read', { method: 'POST', body: fd })
      .then(async (r) => ({ ok: r.ok, j: await r.json() }))
      .then(({ ok, j }) => setLink(ok
        ? { url, status: 'ok', read: j.link, summary: j.summary }
        : { url, status: 'error', summary: j.error ?? 'Could not open that link' }))
      .catch(() => setLink({ url, status: 'error', summary: 'Could not open that link' }));
  }

  function addFiles(list: FileList | File[]) {
    startNew();
    const rejected: string[] = [];
    const newScreens: ScreenPiece[] = [];
    const newFiles: FileItem[] = [];
    for (const f of Array.from(list)) {
      if (isImage(f)) newScreens.push({ id: `${f.name}-${f.size}-${Math.random()}`, file: f, status: 'reading' });
      else {
        const k = fileKind(f);
        if (k) newFiles.push({ id: `${f.name}-${f.size}-${Math.random()}`, kind: k, file: f, status: 'ready' });
        else rejected.push(f.name);
      }
    }
    setError(rejected.length ? `Not sure what to do with ${rejected.join(', ')}` : '');
    if (newFiles.length) setFiles((prev) => [...prev, ...newFiles]);
    if (!newScreens.length) return;
    setScreens((prev) => [...prev, ...newScreens]);
    // Read them side by side; each row fills in as its answer arrives
    for (const s of newScreens) {
      const fd = new FormData();
      fd.append('image', s.file);
      fetch('/api/workouts/read', { method: 'POST', body: fd })
        .then(async (r) => ({ ok: r.ok, j: await r.json() }))
        .then(({ ok, j }) => setScreens((prev) => prev.map((p) => p.id !== s.id ? p : ok
          ? { ...p, status: 'ok', kind: j.kind, fields: j.fields, summary: j.summary }
          : { ...p, status: 'error', summary: j.error ?? 'Could not read this one' })))
        .catch(() => setScreens((prev) => prev.map((p) => p.id === s.id ? { ...p, status: 'error', summary: 'Could not read this one' } : p)));
    }
  }

  // ── What the combined workout will have ───────────────────────────────────
  const usable = screens.filter((s) => s.status === 'ok' && s.kind && s.kind !== 'other');
  const sources: { kind: ScreenKind | 'link'; f: Fields }[] = [
    ...(link?.status === 'ok' && link.read ? [{ kind: 'link' as const, f: link.read }] : []),
    ...usable.map((s) => ({ kind: s.kind!, f: s.fields ?? {} })),
  ].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  const pick = <K extends keyof Fields>(k: K): Fields[K] | undefined =>
    sources.map((s) => s.f[k]).find((v) => v !== null && v !== undefined);

  const sport = pick('sport') ?? pick('title');
  const detected = sport ? classifyActivity(sport) : null;
  const finalActivity: Activity = activity !== 'auto' ? activity : detected ?? 'paddle';
  const distance = pick('distance_m');
  const duration = pick('duration_s');
  const date = pick('workout_date');
  const hasBundle = Boolean(link) || screens.length > 0;
  const reading = (link?.status === 'reading') || screens.some((s) => s.status === 'reading');
  const bundleReady = !reading && Boolean(distance || duration);

  const got: { label: string; on: boolean }[] = [
    { label: 'Distance', on: Boolean(distance) },
    { label: 'Time', on: Boolean(duration) },
    { label: 'Map', on: Boolean(pick('map_image_url')) || usable.some((s) => s.kind === 'overview') },
    { label: 'Mile splits', on: Boolean(pick('mile_splits')?.length) },
    { label: 'Calories', on: Boolean(pick('calories')) },
    { label: 'Best pace', on: Boolean(pick('best_pace_s')) },
    { label: 'Training effect', on: pick('training_effect_aerobic') != null },
    { label: 'Weather', on: pick('weather_temp_f') != null },
    ...(finalActivity !== 'paddle' ? [{ label: 'Strokes', on: Boolean(pick('total_strokes')) }] : []),
    ...(wearsStrap ? [{ label: 'Heart rate', on: Boolean(pick('avg_hr')) }] : []),
  ];

  // ── Saving ────────────────────────────────────────────────────────────────
  async function saveBundle(): Promise<string | null> {
    const fd = new FormData();
    fd.append('name', name);
    if (activity !== 'auto') fd.append('activity', activity);
    if (link?.status === 'ok' && link.read) fd.append('link', JSON.stringify(link.read));
    fd.append('reads', JSON.stringify(usable.map((s) => ({ kind: s.kind, fields: s.fields }))));
    for (const s of usable) fd.append('screen', s.file);
    const res = await fetch('/api/workouts/bundle', { method: 'POST', body: fd });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error ?? 'Could not save that workout');
    const when = j.workout_date ? new Date(`${j.workout_date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const bits = [when, j.distance_m ? `${(j.distance_m / 1609.344).toFixed(2)} mi` : null, j.splits ? `${j.splits} splits` : null].filter(Boolean);
    setDone({ id: j.id, text: `${j.updated ? 'Added to your' : 'Added'} ${bits.join(' · ')}${j.updated ? ' workout' : ''}` });
    return null;
  }

  async function saveFile(item: FileItem): Promise<{ ok: boolean; detail: string }> {
    const fd = new FormData();
    fd.append('name', name);
    if (activity !== 'auto') fd.append('activity', activity);
    fd.append('file', item.file);
    if (item.kind === 'csv') {
      fd.append('commit', 'true');
      const res = await fetch('/api/workouts/import-csv', { method: 'POST', body: fd });
      const j = await res.json();
      return res.ok ? { ok: true, detail: `${j.imported} added, ${j.skipped} already there` } : { ok: false, detail: j.error ?? 'failed' };
    }
    const res = await fetch('/api/workouts', { method: 'POST', body: fd });
    const j = await res.json();
    if (!res.ok) return { ok: false, detail: j.error ?? 'failed' };
    const bits = [j.workout_date?.slice(0, 10), j.distance_m ? `${(j.distance_m / 1609.344).toFixed(2)} mi` : null, j.activity ? ACTIVITY_LABELS[j.activity as Activity] : null];
    return { ok: true, detail: bits.filter(Boolean).join(' · ') || 'added' };
  }

  async function run() {
    if (!name) { setError('Pick your name first.'); return; }
    setBusy(true);
    setError('');
    try {
      if (hasBundle) await saveBundle();
      for (const item of files.filter((f) => f.status !== 'done')) {
        setFiles((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'working' } : p)));
        let out: { ok: boolean; detail: string };
        try { out = await saveFile(item); } catch { out = { ok: false, detail: 'upload failed' }; }
        setFiles((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: out.ok ? 'done' : 'error', detail: out.detail } : p)));
      }
      if (hasBundle) { setLink(null); setScreens([]); setActivity('auto'); }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const pendingFiles = files.filter((f) => f.status !== 'done').length;
  const canSave = !busy && (hasBundle ? bundleReady : pendingFiles > 0);
  const needsActivity = (hasBundle && !detected) || files.some((f) => f.kind === 'gpx');

  const status = (s: 'reading' | 'ok' | 'error') =>
    s === 'reading' ? <span className="text-navy opacity-40 text-xs font-bold">reading…</span>
      : s === 'ok' ? <span className="text-green-700 font-black" aria-label="read">✓</span>
      : <span className="text-terracotta font-black" aria-label="failed">!</span>;

  return (
    <div
      className="space-y-4"
      onPaste={(e) => {
        const el = e.target as HTMLElement;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
        const pasted = Array.from(e.clipboardData.files);
        const text = e.clipboardData.getData('text');
        if (pasted.length) { e.preventDefault(); addFiles(pasted); }
        else if (text.trim()) { e.preventDefault(); addLink(text); }
      }}
    >
      {signedInAs ? (
        <p className="text-navy opacity-50 text-sm">
          Logging for <strong className="opacity-100 text-navy">{signedInAs}</strong>
          <span className="mx-1.5">·</span>
          <Link href="/account" className="underline hover:opacity-100">Account</Link>
        </p>
      ) : (
        <select
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white border-2 border-navy text-navy rounded-lg px-4 py-3 font-semibold focus:outline-none focus:border-gold appearance-none"
        >
          <option value="">Who is this?</option>
          {roster.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      )}

      {done && (
        <div className="border-2 border-green-700/40 bg-green-700/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-green-800 font-bold text-sm">✓ {done.text}</p>
          <Link href={`/dashboard/workout/${done.id}`} className="text-navy text-xs font-black uppercase tracking-wider underline shrink-0">View</Link>
        </div>
      )}

      {!link && (
        <div className="space-y-1.5">
        <input
          type="text"
          inputMode="url"
          value={linkText}
          placeholder="Paste your Garmin link"
          onPaste={(e) => {
            const pasted = Array.from(e.clipboardData.files);
            if (pasted.length) { e.preventDefault(); addFiles(pasted); setLinkText(''); return; }
            // Garmin's Share → Copy puts the link on a second line under "Check out
            // my … activity". A one-line input keeps only the first line, so the
            // link is lost unless it's read from the clipboard here.
            const text = e.clipboardData.getData('text');
            if (text.trim()) { e.preventDefault(); addLink(text); setLinkText(''); }
          }}
          onChange={(e) => {
            const v = e.target.value;
            setLinkText(v);
            setError('');
            if (GARMIN_URL.test(v)) { addLink(v); setLinkText(''); }
          }}
          className="w-full bg-white border-2 border-navy/20 text-navy rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold"
        />
        <p className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-navy opacity-50">
          Garmin app:
          {['Activity', 'Share', 'Web Link', 'Copy'].map((step, i) => (
            <span key={step} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden="true">→</span>}
              <span className="bg-cream-light text-navy rounded px-1.5 py-0.5">{step}</span>
            </span>
          ))}
        </p>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          else { const t = e.dataTransfer.getData('text'); if (t) addLink(t); }
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        className={`rounded-xl border-2 border-dashed text-center cursor-pointer transition-colors ${hasBundle ? 'px-4 py-3' : 'px-5 py-7'} ${
          over ? 'border-gold bg-gold/10' : 'border-navy/30 hover:border-navy/60 bg-navy/[0.02]'
        }`}
      >
        <p className="text-navy font-black uppercase tracking-widest text-sm">{hasBundle ? '+ Add more screenshots' : 'Upload screenshots'}</p>
        {!hasBundle && <p className="text-navy opacity-50 text-sm mt-1">or .GPX, .FIT or .CSV files</p>}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.heic,.fit,.gpx,.csv"
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>


      {!hasBundle && files.length === 0 && (
        <div className="space-y-1">
          <p className="text-navy font-bold text-sm">Combine your Garmin link + screenshots for more data.</p>
          <p className="text-navy opacity-60 text-sm leading-relaxed">
            Paste the activity&apos;s web link above, then screenshot its Overview, Stats, Laps and Charts tabs in the
            Garmin app and choose them all at once.
          </p>
        </div>
      )}

      {error && <p className="text-terracotta font-bold text-sm">{error}</p>}

      {hasBundle && (
        <div className="border-2 border-navy rounded-xl overflow-hidden">
          <div className="bg-cream-light px-4 py-2.5 flex items-baseline justify-between gap-3">
            <span className="text-navy font-black uppercase tracking-widest text-xs">
              {date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'One workout'}
              {' · '}{ACTIVITY_LABELS[finalActivity]}
            </span>
            <span className="text-navy opacity-60 text-xs tabular-nums">
              {[distance ? `${(distance / 1609.344).toFixed(2)} mi` : null, clock(duration)].filter(Boolean).join(' · ')}
            </span>
          </div>
          <ul>
            {link && (
              <li className="flex items-center gap-3 px-4 py-2.5 border-t border-navy/10">
                <div className="flex-1 min-w-0">
                  <p className="text-navy font-bold text-sm">Garmin link</p>
                  <p className="text-navy opacity-50 text-xs truncate">{link.summary ?? link.url.replace(/^https?:\/\//, '')}</p>
                </div>
                {status(link.status)}
                <button type="button" onClick={() => setLink(null)} aria-label="Remove link" className="text-navy opacity-30 hover:opacity-80 text-lg leading-none px-1">×</button>
              </li>
            )}
            {screens.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-navy/10">
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${s.kind === 'other' ? 'text-navy opacity-40' : 'text-navy'}`}>
                    {s.kind ? KIND_LABEL[s.kind] : 'Screenshot'}
                  </p>
                  <p className="text-navy opacity-50 text-xs truncate">
                    {s.status === 'reading' ? s.file.name : s.kind === 'other' ? 'Skipped' : s.summary}
                  </p>
                </div>
                {status(s.status)}
                <button type="button" onClick={() => setScreens((prev) => prev.filter((p) => p.id !== s.id))} aria-label="Remove screenshot" className="text-navy opacity-30 hover:opacity-80 text-lg leading-none px-1">×</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasBundle && !reading && (
        <div className="flex flex-wrap gap-1.5" aria-label="What this workout will have">
          {got.map((g) => (
            <span key={g.label} className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${g.on ? 'bg-green-700/10 text-green-800' : 'bg-navy/5 text-navy opacity-40 line-through'}`}>
              {g.label}
            </span>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 text-sm border-b border-navy/10 pb-1.5 last:border-0">
              <span className="min-w-0 flex-1 truncate text-navy">
                <span className="opacity-40 text-xs uppercase tracking-wider mr-2">{FILE_LABEL[i.kind]}</span>
                {i.file.name}
              </span>
              <span className={`shrink-0 text-xs font-bold ${i.status === 'done' ? 'text-green-700' : i.status === 'error' ? 'text-terracotta' : 'text-navy opacity-40'}`}>
                {i.status === 'working' ? 'reading…' : i.status === 'done' ? `✓ ${i.detail ?? 'added'}` : i.detail ?? (i.status === 'ready' ? 'ready' : '')}
              </span>
            </li>
          ))}
        </ul>
      )}

      {needsActivity && (
        <div>
          <label htmlFor="activity" className="block text-navy text-xs font-black uppercase tracking-wider opacity-50 mb-1">
            What was it?
          </label>
          <select
            id="activity"
            value={activity}
            onChange={(e) => setActivity(e.target.value as Activity | 'auto')}
            className="w-full bg-white border-2 border-navy text-navy rounded-lg px-4 py-2.5 font-semibold text-sm focus:outline-none focus:border-gold appearance-none"
          >
            <option value="auto">Work it out</option>
            {ACTIVITIES.map((a) => <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>)}
          </select>
        </div>
      )}

      {(hasBundle || pendingFiles > 0) && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={run}
            disabled={!canSave}
            className="w-full bg-navy text-white font-black uppercase tracking-widest py-3 rounded-lg hover:bg-terracotta transition-colors disabled:opacity-40"
          >
            {busy ? 'Adding…' : reading ? 'Reading…' : hasBundle ? 'Add workout' : `Add ${pendingFiles} file${pendingFiles !== 1 ? 's' : ''}`}
          </button>
          {hasBundle && !reading && !bundleReady && (
            <p className="text-navy opacity-50 text-xs text-center">Needs a distance or time — add the link or an Overview screenshot.</p>
          )}
          <button type="button" onClick={reset} className="w-full text-navy opacity-40 hover:opacity-80 text-xs font-bold uppercase tracking-wider">
            Start over
          </button>
        </div>
      )}
    </div>
  );
}
