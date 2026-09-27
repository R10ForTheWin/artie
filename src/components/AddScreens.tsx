'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * For a workout that's already logged: pick the Garmin app screenshots in one
 * go and ARTIE fills in whatever the workout is missing.
 */
export default function AddScreens({ workoutId, missing }: { workoutId: number; missing: string[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(files: FileList) {
    if (!files.length) return;
    setBusy(true);
    setError('');
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append('screen', f);
    try {
      const res = await fetch(`/api/workouts/${workoutId}/screens`, { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Could not read those');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read those');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="border-2 border-dashed border-gold bg-gold/10 rounded-xl px-4 py-3 space-y-2">
      {missing.length > 0 && (
        <p className="text-navy text-sm leading-relaxed">
          <b>No {missing.join(' or ')} yet.</b> Add screenshots of the activity&apos;s tabs from the Garmin app — Overview,
          Stats, Laps and Charts, all at once.
        </p>
      )}
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="bg-white border-2 border-gold text-navy font-black uppercase tracking-wider text-xs px-3 py-2 rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-50"
      >
        {busy ? 'Reading…' : '+ Add screenshots'}
      </button>
      <input ref={input} type="file" multiple accept="image/*,.heic" className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
      {error && <p className="text-terracotta font-bold text-sm">{error}</p>}
    </div>
  );
}
