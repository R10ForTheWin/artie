'use client';

import { useState, useEffect } from 'react';

interface SurfSlot {
  date: string;
  period: string;
  waveHeightFt: number;
  windSpeedMph: number;
  windState: string;
}

interface SurfData {
  morning: SurfSlot | null;
  morningLabel: string;
  error?: string;
}

const WIND_STATE_LABEL: Record<string, string> = {
  'glassy':     'Glassy',
  'off':        'Offshore',
  'cross-off':  'Cross-off',
  'cross':      'Cross',
  'cross-on':   'Cross-on',
  'on':         'Onshore',
};

export default function SurfCard() {
  const [data, setData] = useState<SurfData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/surf', { signal: controller.signal })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { if (e.name !== 'AbortError') setLoading(false); });
    return () => controller.abort();
  }, []);

  const m = data?.morning;

  return (
    <div className="border-2 border-navy/20 rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-navy font-bold text-sm whitespace-nowrap">Morning Surf</p>
          <p className="text-navy opacity-40 text-xs mt-0.5">
            Topaz St · 6–11am{data?.morningLabel ? ` · ${data.morningLabel}` : ''}
          </p>
        </div>

        {loading ? (
          <div className="text-navy opacity-40 text-sm">Loading...</div>
        ) : !m ? (
          <div className="text-navy opacity-40 text-sm">Unavailable</div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Wave height */}
            <div className="text-right">
              <span className="bg-sky text-white font-black text-2xl px-3 py-2 rounded-xl leading-none">
                {m.waveHeightFt}ft
              </span>
            </div>
            {/* Wind */}
            <div className="text-right">
              <p className="text-navy font-black text-sm">{m.windSpeedMph} mph</p>
              <p className="text-navy opacity-50 text-xs">{WIND_STATE_LABEL[m.windState] ?? m.windState}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
