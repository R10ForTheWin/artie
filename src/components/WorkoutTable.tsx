'use client';

import { useRouter } from 'next/navigation';
import { formatDate, formatDistanceShort, formatPace } from '@/lib/formatters';

interface Workout {
  id: number;
  name: string;
  workout_date: string;
  distance_m: number | null;
  duration_s: number | null;
  avg_speed_ms: number | null;
  location: string | null;
  mile_splits: number[] | null;
}

function oddMileAvg(splits: number[] | null): number | null {
  if (!splits || splits.length === 0) return null;
  const odd = splits.filter((_, i) => i % 2 === 0);
  if (odd.length === 0) return null;
  return odd.reduce((a, b) => a + b, 0) / odd.length;
}

const th = 'px-2 py-2 text-left text-navy font-black uppercase tracking-wider text-xs opacity-70';
const td = 'px-2 py-2 text-xs';

export default function WorkoutTable({ workouts }: { workouts: Workout[] }) {
  const router = useRouter();
  if (workouts.length === 0) {
    return (
      <div className="border-2 border-navy border-opacity-20 rounded-lg p-8 text-center text-navy opacity-40">
        No workouts yet — be the first to upload one!
      </div>
    );
  }

  return (
    <>
    <div className="flex items-center gap-2 mb-2 sm:hidden text-navy opacity-40">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="10" height="16" rx="2"/>
        <path d="M17 8l3 3-3 3"/>
        <path d="M20 11H14"/>
      </svg>
      <span className="text-xs font-bold uppercase tracking-wider">Rotate for more data</span>
    </div>
    <div className="border-2 border-navy border-opacity-20 rounded-lg overflow-hidden" data-swipe-ignore>
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-navy border-opacity-20 bg-cream-light">
            <th className={th}>Athlete</th>
            <th className={th}>Date</th>
            <th className={th}>Dist</th>
            <th className={`${th} sm:hidden`}></th>
            <th className={`${th} hidden sm:table-cell`}>Pace</th>
            <th className={`${th} hidden sm:table-cell`}>Odd Mi</th>
            <th className={`${th} hidden sm:table-cell`}>Location</th>
            <th className={`${th} hidden sm:table-cell`}></th>
          </tr>
        </thead>
        <tbody>
          {workouts.map((w, i) => (
            <tr key={w.id} onClick={() => router.push(`/dashboard/workout/${w.id}`)} className={`border-b border-navy border-opacity-10 cursor-pointer hover:bg-gold hover:bg-opacity-10 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-cream-light'}`}>
              <td className={`${td} text-navy font-bold`}>{w.name}</td>
              <td className={`${td} text-navy opacity-70 whitespace-nowrap`}>{formatDate(w.workout_date)}</td>
              <td className={`${td} text-gold font-bold whitespace-nowrap`}>{formatDistanceShort(w.distance_m)}</td>
              <td className={`${td} sm:hidden`} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => router.push(`/dashboard/workout/${w.id}`)} className="bg-navy text-white font-black uppercase tracking-wider px-2 py-1 rounded hover:bg-terracotta transition-colors whitespace-nowrap" style={{fontSize: '9px'}}>Details</button>
              </td>
              <td className={`${td} text-navy opacity-70 whitespace-nowrap hidden sm:table-cell`}>{formatPace(w.avg_speed_ms ? 1609.344 / w.avg_speed_ms : null)}</td>
              <td className={`${td} text-navy opacity-70 whitespace-nowrap hidden sm:table-cell`}>{formatPace(oddMileAvg(w.mile_splits))}</td>
              <td className={`${td} text-navy opacity-60 italic hidden sm:table-cell max-w-[100px] truncate`}>{w.location || '—'}</td>
              <td className={`${td} hidden sm:table-cell`} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => router.push(`/dashboard/workout/${w.id}`)} className="bg-navy text-white font-black uppercase tracking-wider px-2 py-1 rounded hover:bg-terracotta transition-colors whitespace-nowrap" style={{fontSize: '9px'}}>Details</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
