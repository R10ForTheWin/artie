'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
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
  const series = showSwims ? [PADDLE, ...SWIMS] : [PADDLE];
  // A leaderboard: one row per person, most miles on top. Rows stack downward,
  // so a bigger crew makes the chart taller instead of crushing names together.
  const shownTotal = (d: Props['data'][number]) => d.miles + (showSwims ? d.oceanSwimMiles + d.poolSwimMiles : 0);
  const chartData = data
    .map((d, i) => ({ ...d, order: i, label: d.name.length > 10 ? d.name.slice(0, 10) : d.name }))
    .sort((a, b) => shownTotal(b) - shownTotal(a) || a.order - b.order);
  const rowHeight = showSwims ? 46 : 30;
  const chartHeight = chartData.length * rowHeight + 32;
  const isEmpty = data.every(d => d.miles === 0 && d.oceanSwimMiles === 0 && d.poolSwimMiles === 0);

  return (
    <div className="border-2 border-navy border-opacity-20 rounded-lg bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-3 px-6 py-4 text-left transition-colors ${open ? 'hover:bg-cream-light/60' : 'bg-white hover:bg-cream-light/60'}`}
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
          </div>
        </div>
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
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            layout="vertical"
            barCategoryGap={showSwims ? 6 : 5}
            barGap={1}
            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
          >
            <YAxis
              type="category"
              dataKey="label"
              width={72}
              interval={0}
              tick={{ fill: '#1B2A4A', fontWeight: 700, fontSize: 12 }}
              axisLine={{ stroke: '#1B2A4A', strokeOpacity: 0.3 }}
              tickLine={false}
            />
            <XAxis
              type="number"
              tick={{ fill: '#1B2A4A', fontSize: 11, opacity: 0.6 }}
              axisLine={false}
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
                radius={[0, 4, 4, 0]}
              >
                <LabelList
                  dataKey={key}
                  position="right"
                  formatter={(v: unknown) => (typeof v === 'number' && v > 0 ? v.toFixed(1) : '')}
                  style={{ fill: '#1B2A4A', fontSize: 10, fontWeight: 700, opacity: 0.7 }}
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
      </div>
      )}
    </div>
  );
}
