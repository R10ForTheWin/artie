import { formatDate, formatDistance, formatDuration, formatSpeed, formatPace } from '@/lib/formatters';

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
  // miles 1, 3, 5, 7... → indices 0, 2, 4, 6...
  const odd = splits.filter((_, i) => i % 2 === 0);
  if (odd.length === 0) return null;
  return odd.reduce((a, b) => a + b, 0) / odd.length;
}

export default function WorkoutTable({ workouts }: { workouts: Workout[] }) {
  if (workouts.length === 0) {
    return (
      <div className="border-2 border-navy border-opacity-20 rounded-lg p-8 text-center text-navy opacity-40">
        No workouts yet — be the first to upload one!
      </div>
    );
  }

  return (
    <div className="border-2 border-navy border-opacity-20 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-navy border-opacity-20 bg-cream-light">
            {['Athlete', 'Date', 'Location', 'Distance', 'Duration', 'Avg Speed', 'Odd Mile Avg'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-navy font-black uppercase tracking-wider text-xs opacity-70">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {workouts.map((w, i) => (
            <tr key={w.id} className={`border-b border-navy border-opacity-10 ${i % 2 === 0 ? 'bg-white' : 'bg-cream-light'}`}>
              <td className="px-4 py-3 text-navy font-bold">{w.name}</td>
              <td className="px-4 py-3 text-navy opacity-70">{formatDate(w.workout_date)}</td>
              <td className="px-4 py-3 text-navy opacity-60 italic">{w.location || '—'}</td>
              <td className="px-4 py-3 text-gold font-bold">{formatDistance(w.distance_m)}</td>
              <td className="px-4 py-3 text-navy opacity-70">{formatDuration(w.duration_s)}</td>
              <td className="px-4 py-3 text-navy opacity-70">{formatSpeed(w.avg_speed_ms)}</td>
              <td className="px-4 py-3 text-navy opacity-70">{formatPace(oddMileAvg(w.mile_splits))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
