'use client';
import { useEffect, useState } from 'react';

export default function WebcamEmbed({ src }: { src: string }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only take over the screen for a phone turned sideways. A desktop window is
    // also wider than it is tall, which used to trigger this and hide the page.
    const check = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      const isShort = window.innerHeight <= 600;
      setFullscreen(isLandscape && isTouch && isShort);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  return (
    <>
      {fullscreen && !dismissed && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#000' }}>
          <iframe src={src} style={{ width: '100%', height: '100%' }} frameBorder={0} allowFullScreen />
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Exit fullscreen webcam"
            style={{
              position: 'absolute', top: 12, right: 12, zIndex: 51,
              width: 36, height: 36, borderRadius: 18, border: 'none',
              background: 'rgba(0,0,0,0.55)', color: '#fff',
              fontSize: 20, lineHeight: '36px', cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}
      <div className="rounded-xl overflow-hidden border-2 border-navy border-opacity-10">
        <iframe src={src} className="w-full" style={{ height: 180 }} frameBorder={0} allowFullScreen />
      </div>
    </>
  );
}
