'use client';
import { useEffect, useState } from 'react';

export default function WebcamEmbed({ src }: { src: string }) {
  const [landscape, setLandscape] = useState(false);

  useEffect(() => {
    const check = () => setLandscape(window.innerWidth > window.innerHeight);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <>
      {landscape && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#000' }}>
          <iframe src={src} style={{ width: '100%', height: '100%' }} frameBorder={0} allowFullScreen />
        </div>
      )}
      <div className="rounded-xl overflow-hidden border-2 border-navy border-opacity-10">
        <iframe src={src} className="w-full" style={{ height: 180 }} frameBorder={0} allowFullScreen />
      </div>
    </>
  );
}
