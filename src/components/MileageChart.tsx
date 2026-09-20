'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ACTIVITY_COLORS, ACTIVITY_LABELS } from '@/lib/activity';

interface Props {
  data: { name: string; miles: number; oceanSwimMiles: number; poolSwimMiles: number }[];
  title: string;
  subtitle?: string;
  /** Swim tracking started with the 2027 season; earlier seasons show paddle only. */
  showSwims?: boolean;
  /** Past seasons collapse by default, the same way past months do in the workout table. */
  defaultOpen?: boolean;
}

const PADDLE = { key: 'miles', activity: 'paddle' as const };
const SWIMS = [
  { key: 'oceanSwimMiles', activity: 'ocean_swim' as const },
  { key: 'poolSwimMiles', activity: 'pool_swim' as const },
];

export default function MileageChart({ data, title, subtitle, showSwims = false, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const chartData = data.map(d => ({ ...d, label: d.name.length > 8 ? d.name.slice(0, 8) : d.name }));
  const series = showSwims ? [PADDLE, ...SWIMS] : [PADDLE];
  const isEmpty = data.every(d => d.miles === 0 && d.oceanSwimMiles === 0 && d.poolSwimMiles === 0);
  const totalMiles = data.reduce((a, d) => a + d.miles + d.oceanSwimMiles + d.poolSwimMiles, 0);

  return (
    <div className="border-2 border-navy border-opacity-20 rounded-lg bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-3 px-6 py-4 text-left transition-colors ${open ? 'hover:bg-navy/5' : 'bg-navy/5 hover:bg-navy/10'}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            className={`shrink-0 text-navy opacity-60 transition-transform ${open ? 'rotate-90' : ''}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <div className="min-w-0">
            <h2 className="text-navy font-black uppercase tracking-widest text-lg">{title}</h2>
            {subtitle && <p className="text-navy opacity-40 text-xs font-bold uppercase tracking-wider mt-1">{subtitle}</p>}
          </div>
        </div>
        <span className="text-navy opacity-40 text-xs font-semibold shrink-0 tabular-nums">
          {totalMiles.toFixed(1)} mi
        </span>
      </button>

      {open && (
      <div className="px-6 pb-6">
      {/* Plain HTML legend — recharts' <Legend> reserves a fixed height and
          overlaps the plot when it wraps on a narrow screen. */}
      {showSwims && !isEmpty && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
          {series.map(({ activity }) => (
            <span key={activity} className="flex items-center gap-1.5 text-navy font-black uppercase tracking-wider text-[11px]">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: ACTIVITY_COLORS[activity] }} />
              {ACTIVITY_LABELS[activity]}
            </span>
          ))}
        </div>
      )}

      {isEmpty ? (
        <p className="text-navy opacity-30 text-sm py-12 text-center">No miles logged this season yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 48 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: '#1B2A4A', fontWeight: 700, fontSize: 11 }}
              axisLine={{ stroke: '#1B2A4A', strokeOpacity: 0.3 }}
              tickLine={false}
              interval={0}
              angle={-45}
              textAnchor="end"
              dx={-4}
              dy={4}
            />
            <YAxis
              tick={{ fill: '#1B2A4A', fontSize: 12, opacity: 0.6 }}
              axisLine={{ stroke: '#1B2A4A', strokeOpacity: 0.3 }}
              tickLine={false}
              tickFormatter={(v) => `${v} mi`}
            />
            <Tooltip
              contentStyle={{ background: '#fff', border: '2px solid #1B2A4A', color: '#1B2A4A', borderRadius: 8 }}
              formatter={(value: number | undefined, seriesName) => [`${(value ?? 0).toFixed(2)} mi`, seriesName]}
            />
            {series.map(({ key, activity }) => (
              <Bar
                key={key}
                dataKey={key}
                name={ACTIVITY_LABELS[activity]}
                fill={ACTIVITY_COLORS[activity]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
      </div>
      )}
    </div>
  );
}
