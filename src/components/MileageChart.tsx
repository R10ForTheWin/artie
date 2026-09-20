'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ACTIVITY_COLORS, ACTIVITY_LABELS } from '@/lib/activity';

interface Props {
  data: { name: string; miles: number; oceanSwimMiles: number; poolSwimMiles: number }[];
  title: string;
  subtitle?: string;
  /** Swim tracking started with the 2027 season; earlier seasons show paddle only. */
  showSwims?: boolean;
}

const PADDLE = { key: 'miles', activity: 'paddle' as const };
const SWIMS = [
  { key: 'oceanSwimMiles', activity: 'ocean_swim' as const },
  { key: 'poolSwimMiles', activity: 'pool_swim' as const },
];

export default function MileageChart({ data, title, subtitle, showSwims = false }: Props) {
  const chartData = data.map(d => ({ ...d, label: d.name.length > 8 ? d.name.slice(0, 8) : d.name }));
  const series = showSwims ? [PADDLE, ...SWIMS] : [PADDLE];
  const isEmpty = data.every(d => d.miles === 0 && d.oceanSwimMiles === 0 && d.poolSwimMiles === 0);

  return (
    <div className="border-2 border-navy border-opacity-20 rounded-lg p-6 bg-white">
      <div className="mb-6">
        <h2 className="text-navy font-black uppercase tracking-widest text-lg">{title}</h2>
        {subtitle && <p className="text-navy opacity-40 text-xs font-bold uppercase tracking-wider mt-1">{subtitle}</p>}
      </div>

      {isEmpty ? (
        <p className="text-navy opacity-30 text-sm py-12 text-center">No miles logged this season yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 72 }}>
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
            {showSwims && (
              <Legend
                verticalAlign="top"
                align="left"
                height={28}
                iconType="square"
                wrapperStyle={{ fontSize: 11, fontWeight: 700, color: '#1B2A4A', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              />
            )}
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
  );
}
