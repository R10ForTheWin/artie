'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';


interface Props {
  data: { name: string; miles: number }[];
}

export default function MileageChart({ data }: Props) {
  const chartData = data.map(d => ({ ...d, label: d.name.length > 8 ? d.name.slice(0, 8) : d.name }));
  return (
    <div className="border-2 border-navy border-opacity-20 rounded-lg p-6 bg-white">
      <h2 className="text-navy font-black uppercase tracking-widest text-lg mb-6">
        Total Miles Since March 1, 2026
      </h2>
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
            formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(2)} mi`, 'Miles']}
          />
          <Bar dataKey="miles" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => {
              const colors = ['#1B2A4A', '#5B8DB8', '#C4532A', '#C9922A', '#EDD9A3', '#1B2A4A', '#5B8DB8', '#C4532A'];
              return <Cell key={entry.label} fill={entry.miles > 0 ? colors[index % colors.length] : '#f0f0f0'} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
