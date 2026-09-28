'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ACTIVITIES, ACTIVITY_LABELS, type Activity } from '@/lib/activity';

// Only distance matters here. Paddles in miles (0.5 steps, start at 10),
// swims in yards (100 steps, start at 3,000). A select shows as a scroll wheel
// on a phone, so picking a distance is a flick rather than typing.
const SCALE: Record<Activity, { unit: 'mi' | 'yd'; start: number; step: number; max: number }> = {
  paddle: { unit: 'mi', start: 10, step: 0.5, max: 40 },
  ocean_swim: { unit: 'yd', start: 3000, step: 100, max: 10000 },
  pool_swim: { unit: 'yd', start: 3000, step: 100, max: 10000 },
};
const choices = (a: Activity) => {
  const { step, max } = SCALE[a];
  return Array.from({ length: Math.round(max / step) }, (_, i) => Number(((i + 1) * step).toFixed(1)));
};

const todayPacific = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());

/** For a workout with no file, link or screenshot: type it in. */
export default function ManualEntry() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState<Activity>('paddle');
  const [date, setDate] = useState(todayPacific);
  const [distance, setDistance] = useState<number>(SCALE.paddle.start);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ id: number; text: string } | null>(null);

  function pick(a: Activity) {
    setActivity(a);
    setDistance(SCALE[a].start);
  }
  const unit = SCALE[activity].unit;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/workouts/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity, date, distance, unit }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? 'Could not save that workout.'); return; }
      const when = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      setSaved({ id: j.id, text: `Added ${ACTIVITY_LABELS[activity].toLowerCase()} · ${when} · ${distance.toLocaleString()} ${unit}` });
      router.refresh();
    } catch {
      setError('Could not reach ARTIE.');
    } finally {
      setBusy(false);
    }
  }

  const field = 'w-full bg-white border-2 border-navy/20 text-navy rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold';
  const label = 'block text-navy text-[11px] font-black uppercase tracking-wider opacity-50 mb-1';

  if (!open) {
    return (
      <div className="space-y-2">
        {saved && (
          <p className="text-green-800 font-bold text-sm">
            ✓ {saved.text} · <Link href={`/dashboard/workout/${saved.id}`} className="underline">View</Link>
          </p>
        )}
        <button
          type="button"
          onClick={() => { setOpen(true); setSaved(null); }}
          className="w-full border-2 border-navy/20 text-navy font-black uppercase tracking-widest text-xs py-3 rounded-lg hover:border-navy/60 transition-colors"
        >
          + Enter a workout by hand
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="border-2 border-navy/20 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-navy font-black uppercase tracking-widest text-sm">Enter by hand</p>
        <button type="button" onClick={() => setOpen(false)} className="text-navy opacity-40 hover:opacity-80 text-xs font-bold uppercase tracking-wider">
          Close
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-navy/10" role="radiogroup" aria-label="Activity">
        {ACTIVITIES.map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={activity === a}
            onClick={() => pick(a)}
            className={`py-2 rounded-md text-[11px] font-black uppercase tracking-wider transition-colors ${
              activity === a ? 'bg-navy text-white' : 'text-navy opacity-60 hover:opacity-100'
            }`}
          >
            {ACTIVITY_LABELS[a]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="m-date" className={label}>Date</label>
          <input id="m-date" type="date" value={date} max={todayPacific()} onChange={(e) => setDate(e.target.value)} className={field} required />
        </div>
        <div>
          <label htmlFor="m-dist" className={label}>Distance</label>
          <select
            id="m-dist"
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            className={`${field} font-bold tabular-nums`}
          >
            {choices(activity).map((v) => (
              <option key={v} value={v}>{v.toLocaleString()} {unit}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-terracotta font-bold text-sm">{error}</p>}

      <button
        type="submit"
        disabled={busy || !date}
        className="w-full bg-navy text-white font-black uppercase tracking-widest py-3 rounded-lg hover:bg-terracotta transition-colors disabled:opacity-40"
      >
        {busy ? 'Adding…' : `Add ${ACTIVITY_LABELS[activity].toLowerCase()}`}
      </button>
    </form>
  );
}
