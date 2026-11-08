'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clipboardImages } from '@/lib/clipboard';

/**
 * For a workout that's already logged: pick the Garmin app screenshots in one
 * go and ARTIE fills in whatever the workout is missing.
 */
export default function AddScreens({ workoutId, missing }: { workoutId: number; missing: string[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(files: FileList | File[]) {
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

  async function paste() {
    setError('');
    try {
      const imgs = await clipboardImages();
      if (!imgs.length) { setError('No screenshot on the clipboard. Copy one first, then tap Paste.'); return; }
      await upload(imgs);
    } catch (e) {
      setError(e instanceof Error && e.message.includes('browser') ? e.message : 'Could not read the clipboard. Copy the screenshot again, then tap Paste.');
    }
  }

  // Cmd/Ctrl+V anywhere on the page works too, on a computer
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
      const imgs = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
      if (imgs.length) { e.preventDefault(); upload(imgs); }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // upload only closes over stable refs and setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="border-2 border-dashed border-gold bg-gold/10 rounded-xl px-4 py-3 space-y-2">
      {missing.length > 0 && (
        <p className="text-navy text-sm leading-relaxed">
          <b>No {missing.join(' or ')} yet.</b> Add screenshots of the activity&apos;s tabs from the Garmin app — Overview,
          Stats, Laps and Charts, all at once.
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={paste}
          disabled={busy}
          className="bg-white border-2 border-gold text-navy font-black uppercase tracking-wider text-xs px-3 py-2 rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-50"
        >
          {busy ? 'Reading…' : 'Paste screenshot'}
        </button>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="bg-white border-2 border-gold text-navy font-black uppercase tracking-wider text-xs px-3 py-2 rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-50"
        >
          + Choose files
        </button>
      </div>
      <input ref={input} type="file" multiple accept="image/*,.heic" className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
      {error && <p className="text-terracotta font-bold text-sm">{error}</p>}
    </div>
  );
}
