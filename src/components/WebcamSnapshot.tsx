'use client';
import { useEffect, useState } from 'react';

/**
 * For a camera that only posts still photos: show the newest one, refresh it
 * every few minutes, and link out to the live stream that can't be embedded.
 */
export default function WebcamSnapshot({ src, liveUrl, liveLabel }: { src: string; liveUrl?: string; liveLabel?: string }) {
  const [stamp, setStamp] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setStamp(Date.now()), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const photo = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${src}${src.includes('?') ? '&' : '?'}t=${stamp}`} alt="Latest webcam photo" className="w-full h-full object-cover" />
      <span className="absolute left-2 bottom-2 rounded-md bg-black/55 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1">
        Latest photo
      </span>
      {liveUrl && (
        <span className="absolute right-2 bottom-2 rounded-md bg-navy text-white text-[11px] font-black uppercase tracking-wider px-2.5 py-1.5 group-hover:bg-terracotta transition-colors">
          {liveLabel ?? 'Watch live'} ▶
        </span>
      )}
    </>
  );
  const box = 'group relative block rounded-xl overflow-hidden border-2 border-navy border-opacity-10 bg-navy/5';

  // The whole photo is the tap target for the live stream, not just the badge.
  // Same window, not a new tab: Back returns to ARTIE, and the home-screen app
  // shows it over ARTIE with a Done button.
  return liveUrl ? (
    <a href={liveUrl} className={box} style={{ height: 180 }} aria-label="Watch the live stream">
      {photo}
    </a>
  ) : (
    <div className={box} style={{ height: 180 }}>{photo}</div>
  );
}
