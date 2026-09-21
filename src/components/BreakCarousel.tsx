'use client';

import { useEffect, useRef, useState } from 'react';
import { BREAKS } from '@/lib/breaks';
import WebcamEmbed from './WebcamEmbed';
import OceanTempCard from './OceanTempCard';
import SurfCard from './SurfCard';

/**
 * One break on screen at a time — webcam, water temperature and morning surf —
 * with the rest a swipe away. Uses CSS scroll-snap rather than a carousel
 * library: swiping, momentum and keyboard scrolling all come from the browser,
 * and with one break it simply renders as it always did.
 */
export default function BreakCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Work out which panel is centred, so the tabs and dots stay in sync with a swipe
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const i = Math.round(track.scrollLeft / track.clientWidth);
        setActive(Math.max(0, Math.min(BREAKS.length - 1, i)));
      });
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      track.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Jump instantly rather than smoothly: scroll-snap-type: mandatory cancels an
  // animated programmatic scroll, leaving the track stuck where it started.
  // Swiping by hand still animates, because that is the browser's own scroll.
  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: i * track.clientWidth, behavior: 'auto' });
    setActive(i);
  };

  const multiple = BREAKS.length > 1;

  return (
    <div className="w-full">
      {multiple && (
        <div className="flex gap-1.5 mb-2">
          {BREAKS.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === active}
              className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors ${
                i === active ? 'bg-navy text-white' : 'bg-navy/10 text-navy hover:bg-navy/20'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      <div
        ref={trackRef}
        className="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* w-full, not min-w-full: a flex item with only a min-width can still
            grow past the container when its content is wider, which leaves the
            panels different widths and breaks snapping. */}
        {BREAKS.map((b) => (
          <div key={b.id} className="w-full shrink-0 snap-center overflow-hidden">
            <div className="flex flex-col gap-2 min-w-0">
              <WebcamEmbed src={b.webcam} />
              <OceanTempCard buoy={b.buoy} buoyLabel={b.buoyLabel} />
              <SurfCard lat={b.lat} lon={b.lon} buoy={b.buoy} spotLabel={b.spotLabel} />
            </div>
          </div>
        ))}
      </div>

      {multiple && (
        <div className="flex justify-center gap-1.5 mt-2">
          {BREAKS.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show ${b.name}`}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? 'w-5 bg-navy' : 'w-1.5 bg-navy/25 hover:bg-navy/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
