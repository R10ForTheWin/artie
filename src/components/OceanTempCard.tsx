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

const RANGES = [7, 30, 90, 180, 365] as const;
type Range = typeof RANGES[number];
const RANGE_LABELS: Record<Range, string> = { 7: '7D', 30: '1M', 90: '3M', 180: '6M', 365: '1Y' };

export default function OceanTempCard() {
  const [data, setData] = useState<OceanTempData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>(30);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/ocean-temp', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { if (e.name !== 'AbortError') setLoading(false); });
    return () => controller.abort();
  }, []);

  const allData = data?.history?.map((d) => ({ ...d, label: formatLabel(d.date) })) ?? [];
  const chartData = allData.slice(-range);
  const tickInterval = Math.max(1, Math.floor(chartData.length / 6));

  return (
    <div className="border-2 border-navy/20 rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-navy font-bold text-sm whitespace-nowrap">Ocean Temp</p>
          <p className="text-navy opacity-40 text-xs mt-0.5">MB · NOAA Buoy 46222</p>
        </div>

        {loading ? (
          <div className="text-navy opacity-40 text-sm">Loading...</div>
        ) : data?.current_f ? (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-2 bg-sky text-white font-black text-2xl px-4 py-2 rounded-xl hover:opacity-80 transition-opacity"
          >
            {data.current_f}°F
            {expanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 opacity-80" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 opacity-80" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            )}
          </button>
        ) : (
          <div className="text-navy opacity-40 text-sm">Unavailable</div>
        )}
      </div>

      {expanded && chartData.length > 0 && (
        <div className="mt-6">
          <div className="flex gap-1 mb-4 justify-end">
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
                domain={['auto', 'auto']}
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
                stroke="#5B8DB8"
                strokeWidth={2.5}
                dot={{ fill: '#5B8DB8', r: 3 }}
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
              <div className="w-5 h-0.5 bg-sky rounded" />
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
      )}
    </div>
  );
}
