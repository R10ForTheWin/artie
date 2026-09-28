'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ACTIVITIES, ACTIVITY_LABELS, type Activity } from '@/lib/activity';

type Unit = 'mi' | 'yd' | 'm' | 'km';

// What people actually use: paddles in miles, swims in yards
const DEFAULT_UNIT: Record<Activity, Unit> = { paddle: 'mi', ocean_swim: 'yd', pool_swim: 'yd' };

const todayPacific = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());

/** For a workout with no file, link or screenshot: type it in. */
export default function ManualEntry() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState<Activity>('paddle');
  const [date, setDate] = useState(todayPacific);
  const [distance, setDistance] = useState('');
  const [unit, setUnit] = useState<Unit>('mi');
  const [duration, setDuration] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ id: number; text: string } | null>(null);

  function pick(a: Activity) {
    setActivity(a);
    setUnit(DEFAULT_UNIT[a]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/workouts/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity, date, distance, unit, duration, location }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? 'Could not save that workout.'); return; }
      const when = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      setSaved({ id: j.id, text: `Added ${ACTIVITY_LABELS[activity].toLowerCase()} · ${when} · ${distance} ${unit}` });
      setDistance(''); setDuration(''); setLocation('');
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
          <label htmlFor="m-time" className={label}>Time <span className="normal-case tracking-normal font-bold">(optional)</span></label>
          <input id="m-time" type="text" inputMode="numeric" placeholder="1:05:30" value={duration} onChange={(e) => setDuration(e.target.value)} className={field} />
        </div>
      </div>

      <div>
        <label htmlFor="m-dist" className={label}>Distance</label>
        <div className="flex gap-2">
          <input
            id="m-dist"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder={unit === 'mi' ? '10.4' : '2500'}
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className={field}
            required
          />
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} aria-label="Unit" className="bg-white border-2 border-navy/20 text-navy rounded-lg px-2 text-sm font-bold focus:outline-none focus:border-gold">
            <option value="mi">mi</option>
            <option value="yd">yd</option>
            <option value="m">m</option>
            <option value="km">km</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="m-loc" className={label}>Where <span className="normal-case tracking-normal font-bold">(optional)</span></label>
        <input id="m-loc" type="text" placeholder={activity === 'pool_swim' ? 'El Segundo' : 'Topaz'} value={location} onChange={(e) => setLocation(e.target.value)} className={field} />
      </div>

      {error && <p className="text-terracotta font-bold text-sm">{error}</p>}

      <button
        type="submit"
        disabled={busy || !distance || !date}
        className="w-full bg-navy text-white font-black uppercase tracking-widest py-3 rounded-lg hover:bg-terracotta transition-colors disabled:opacity-40"
      >
        {busy ? 'Adding…' : `Add ${ACTIVITY_LABELS[activity].toLowerCase()}`}
      </button>
    </form>
  );
}
