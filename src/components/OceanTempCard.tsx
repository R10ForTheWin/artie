'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DayEntry {
  date: string;
  temp_f: number;
  norm_f: number;
}

interface OceanTempData {
  current_f: number | null;
  history: DayEntry[];
  error?: string;
}

function formatLabel(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** How the water feels to a paddler, by surface temperature in °F */
function tempFeel(f: number): { label: string } {
  if (f > 70) return { label: 'Warm' };
  if (f >= 65) return { label: 'Cool' };
  if (f >= 60) return { label: 'Cold' };
  return { label: 'Freezing' };
}

// Badge colour slides from deep blue (freezing) through the theme's sky and
// gold to orange (warm), so the number reads at a glance before the label does.
const TEMP_STOPS: [number, [number, number, number]][] = [
  [56, [0x1f, 0x4e, 0x8c]],
  [62, [0x5b, 0x8d, 0xb8]],
  [67, [0xc9, 0x92, 0x2a]],
  [72, [0xe0, 0x6a, 0x1f]],
];

function tempColor(f: number): string {
  const [first] = TEMP_STOPS;
  const last = TEMP_STOPS[TEMP_STOPS.length - 1];
  let rgb = f <= first[0] ? first[1] : last[1];
  for (let i = 1; i < TEMP_STOPS.length; i++) {
    const [t0, c0] = TEMP_STOPS[i - 1];
    const [t1, c1] = TEMP_STOPS[i];
    if (f > t0 && f <= t1) {
      const k = (f - t0) / (t1 - t0);
      rgb = [0, 1, 2].map((j) => Math.round(c0[j] + (c1[j] - c0[j]) * k)) as [number, number, number];
      break;
    }
  }
  return `rgb(${rgb.join(', ')})`;
}

/** Air temperature bands, in theme colours (separate scale from the water's). */
function airBand(f: number): { label: string; color: string } {
  if (f >= 70) return { label: 'Warm', color: '#C4532A' }; // terracotta
  if (f >= 60) return { label: 'Moderate', color: '#C9922A' }; // gold
  if (f >= 50) return { label: 'Cool', color: '#5B8DB8' }; // sky
  return { label: 'Cold', color: '#1B2A4A' }; // navy
}

const RANGES = [7, 30, 90, 180, 365] as const;
type Range = typeof RANGES[number];
const RANGE_LABELS: Record<Range, string> = { 7: '7D', 30: '1M', 90: '3M', 180: '6M', 365: '1Y' };

interface OceanTempCardProps {
  buoy?: string;
  /** Where to read the air temperature (the break itself) */
  lat?: number;
  lon?: number;
}

export default function OceanTempCard({ buoy, lat, lon }: OceanTempCardProps = {}) {
  const tempUrl = buoy ? `/api/ocean-temp?buoy=${buoy}` : '/api/ocean-temp';
  const airUrl = lat != null && lon != null ? `/api/air-temp?lat=${lat}&lon=${lon}` : '/api/air-temp';
  const water = useTempData(tempUrl);
  const air = useTempData(airUrl);
  const [open, setOpen] = useState<'water' | 'air' | null>(null);
  const toggle = (which: 'water' | 'air') => setOpen((o) => (o === which ? null : which));

  const waterF = water.data?.current_f ?? null;
  const airF = air.data?.current_f ?? null;

  return (
    <div className="border-2 border-navy/20 rounded-xl p-4 bg-white">
      <div className="grid grid-cols-2 gap-2">
        <TempTile
          label="Water temp"
          value={waterF}
          loading={water.loading}
          color={waterF != null ? tempColor(waterF) : null}
          title={waterF != null ? tempFeel(waterF).label : ''}
          open={open === 'water'}
          canOpen={(water.data?.history?.length ?? 0) > 0}
          onClick={() => toggle('water')}
        />
        <TempTile
          label="Air temp"
          value={airF}
          loading={air.loading}
          color={airF != null ? airBand(airF).color : null}
          title={airF != null ? airBand(airF).label : ''}
          open={open === 'air'}
          canOpen={(air.data?.history?.length ?? 0) > 0}
          onClick={() => toggle('air')}
        />
      </div>

      {open === 'water' && <TempChart history={water.data?.history ?? []} heading="Water temp · daily" actualColor="#5B8DB8" />}
      {open === 'air' && <TempChart history={air.data?.history ?? []} heading="Air temp · daily high" actualColor="#C9922A" />}
    </div>
  );
}

function useTempData(url: string) {
  const [data, setData] = useState<OceanTempData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { if (e.name !== 'AbortError') setLoading(false); });
    return () => controller.abort();
  }, [url]);
  return { data, loading };
}

function TempTile({ label, value, loading, color, title, open, canOpen, onClick }: {
  label: string; value: number | null; loading: boolean; color: string | null;
  title: string; open: boolean; canOpen: boolean; onClick: () => void;
}) {
  if (value == null || !color) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-navy/10 py-2">
        <span className="text-navy text-[11px] font-black uppercase tracking-wide">{label}</span>
        <span className="text-navy opacity-40 text-sm">{loading ? 'Loading...' : 'Unavailable'}</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={canOpen ? onClick : undefined}
      aria-expanded={canOpen ? open : undefined}
      className={`flex flex-col items-center justify-center text-white rounded-xl py-2 transition-opacity ${canOpen ? 'hover:opacity-80' : 'cursor-default'}`}
      style={{ backgroundColor: color }}
      title={canOpen ? `${title} · tap for history` : title}
    >
      <span className="text-[11px] font-black uppercase tracking-wide opacity-90">{label}</span>
      <span className="flex items-center gap-1.5 font-black text-2xl leading-tight">
        {value}°F
        {canOpen && (open ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 opacity-80" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 opacity-80" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
        ))}
      </span>
    </button>
  );
}

function TempChart({ history, heading, actualColor }: { history: DayEntry[]; heading: string; actualColor: string }) {
  const [range, setRange] = useState<Range>(30);
  const chartData = history.map((d) => ({ ...d, label: formatLabel(d.date) })).slice(-range);
  const tickInterval = Math.max(1, Math.floor(chartData.length / 6));
  if (chartData.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <p className="text-navy text-xs font-black uppercase tracking-wider opacity-60">{heading}</p>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider transition-colors ${
                range === r
                  ? 'bg-navy text-white'
                  : 'bg-navy/10 text-navy hover:bg-navy/20'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: '#1B2A4A', fontSize: 11 }}
            axisLine={{ stroke: '#1B2A4A', strokeOpacity: 0.3 }}
            tickLine={false}
            interval={tickInterval}
          />
          <YAxis
            tick={{ fill: '#1B2A4A', fontSize: 11, opacity: 0.6 }}
            axisLine={{ stroke: '#1B2A4A', strokeOpacity: 0.3 }}
            tickLine={false}
            tickFormatter={(v) => `${v}°`}
            /* Pad the range so the historical-average line never sits flat on the
               axis, where it reads as a chart artifact rather than a real value. */
            domain={[
              (dataMin: number) => Math.floor(dataMin - 2),
              (dataMax: number) => Math.ceil(dataMax + 2),
            ]}
          />
          <Tooltip
            contentStyle={{
              background: '#fff',
              border: '2px solid #1B2A4A',
              color: '#1B2A4A',
              borderRadius: 8,
              fontSize: 13,
            }}
            formatter={(value: number | undefined, name: string | undefined) => [
              `${value ?? '—'}°F`,
              name === 'temp_f' ? 'Actual' : 'Historical Avg',
            ]}
          />
          <Line
            type="monotone"
            dataKey="temp_f"
            stroke={actualColor}
            strokeWidth={2.5}
            dot={{ fill: actualColor, r: 3 }}
            activeDot={{ r: 5 }}
            name="temp_f"
          />
          <Line
            type="monotone"
            dataKey="norm_f"
            stroke="#C4532A"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            name="norm_f"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex gap-5 mt-3 justify-center">
        <div className="flex items-center gap-1.5 text-xs text-navy opacity-60">
          <div className="w-5 h-0.5 rounded" style={{ backgroundColor: actualColor }} />
          Actual
        </div>
        <div className="flex items-center gap-1.5 text-xs text-navy opacity-60">
          <svg width="20" height="6">
            <line x1="0" y1="3" x2="20" y2="3" stroke="#C4532A" strokeWidth="1.5" strokeDasharray="5 4" />
          </svg>
          Historical Avg
        </div>
      </div>
    </div>
  );
}
