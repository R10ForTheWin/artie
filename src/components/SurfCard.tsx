'use client';

import { useState, useEffect } from 'react';

interface WindHour {
  hour: number;
  speedMph: number;
  direction: string;
}

interface SurfSlot {
  date: string;
  waveHeightFt: number;
  windState: string;
  windHours: WindHour[];
}

interface SurfData {
  morning: SurfSlot | null;
  morningLabel: string;
  error?: string;
}

const WIND_STATE_LABEL: Record<string, string> = {
  'glassy':    'Glassy',
  'off':       'Offshore',
  'cross-off': 'Cross-off',
  'cross':     'Cross',
  'cross-on':  'Cross-on',
  'on':        'Onshore',
};

function fmtHour(h: number) {
  return h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`;
}

export default function SurfCard() {
  const [data, setData] = useState<SurfData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/surf', { signal: controller.signal })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { if (e.name !== 'AbortError') { setData({ morning: null, morningLabel: '' }); setLoading(false); } });
    return () => controller.abort();
  }, []);

  const m = data?.morning;

  return (
    <div className="border-2 border-navy/20 rounded-xl p-4 bg-white">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-3">
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
            <span className="bg-sky text-white font-black text-2xl px-3 py-1.5 rounded-xl leading-none">
              {m.waveHeightFt}ft
            </span>
            <span className="text-navy opacity-50 text-xs font-medium">
              {WIND_STATE_LABEL[m.windState] ?? m.windState}
            </span>
          </div>
        )}
      </div>

      {/* Hourly wind table */}
      {m && m.windHours?.length > 0 && (
        <div className="flex justify-between border-t border-navy/10 pt-2">
          {m.windHours.map(w => (
            <div key={w.hour} className="flex flex-col items-center gap-0.5">
              <span className="text-navy opacity-40 text-xs">{fmtHour(w.hour)}</span>
              <span className="text-navy font-bold text-xs">{w.speedMph}</span>
              <span className="text-navy opacity-50 text-xs">{w.direction}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
