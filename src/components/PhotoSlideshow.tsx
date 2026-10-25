'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AlbumPhoto } from '@/lib/album';

// Keep in step with the push-in in globals.css, which runs a little longer
// so the photo is still moving when the next one fades in over it
const ADVANCE_MS = 9000;
// Image URLs from iCloud expire after ~20 minutes; the API caches for 5,
// so refreshing this often keeps every URL comfortably inside its window.
const REFRESH_MS = 5 * 60 * 1000;
const SWIPE_PX = 40;

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Team Topaz shared album as a crossfading slideshow. Advances on its own,
 * swipes by hand, and only ever loads the photo on screen plus the next one.
 */
export default function PhotoSlideshow() {
  const [order, setOrder] = useState<string[]>([]);
  const [byId, setById] = useState<Record<string, AlbumPhoto>>({});
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  // Load the album, then refresh the signed URLs while keeping the shuffle order
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/album');
        const { photos }: { photos: AlbumPhoto[] } = await res.json();
        if (cancelled || photos.length === 0) return;
        setById(Object.fromEntries(photos.map((p) => [p.id, p])));
        setOrder((prev) => {
          const ids = new Set(photos.map((p) => p.id));
          const kept = prev.filter((id) => ids.has(id));
          const added = shuffle(photos.map((p) => p.id).filter((id) => !kept.includes(id)));
          return [...kept, ...added];
        });
      } catch {
        // Leave whatever is showing; the next refresh may succeed
      }
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const count = order.length;
  const step = useCallback(
    (by: number) => setIndex((i) => (count ? (i + by + count) % count : 0)),
    [count],
  );

  // Advance on a timer, restarting it whenever the photo changes by hand
  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = setTimeout(() => step(1), ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [index, count, paused, step]);

  // No point cycling (and downloading) photos while the tab is hidden
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (count === 0) return null;

  const current = byId[order[index % count]];
  const next = byId[order[(index + 1) % count]];

  return (
    <div className="w-full">
      <div
        className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-navy/10 select-none"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > SWIPE_PX) step(dx < 0 ? 1 : -1);
        }}
      >
        {/* Keyed by photo so each change mounts a fresh img that fades in over the last */}
        {current && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.id}
            src={current.src}
            alt={current.by ? `Team Topaz photo by ${current.by}` : 'Team Topaz photo'}
            className="absolute inset-0 w-full h-full object-cover origin-center animate-slide-in motion-reduce:animate-none"
            onError={() => step(1)}
            draggable={false}
          />
        )}
        {/* Warm the cache for the next photo so the fade never shows a blank */}
        {next && next !== current && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={next.src} alt="" aria-hidden className="hidden" />
        )}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute inset-y-0 left-0 w-1/4"
            />
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute inset-y-0 right-0 w-1/4"
            />
          </>
        )}
      </div>
      {current?.by && (
        <p className="text-navy/40 text-[10px] font-bold uppercase tracking-wider text-right mt-1">
          {current.by}
        </p>
      )}
    </div>
  );
}
