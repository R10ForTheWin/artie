'use client';

import { useState } from 'react';
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
  file_name: string;
  file_type: string;
}

function sourceLabel(file_name: string, file_type: string): { label: string; title: string } {
  if (file_name.startsWith('strava-')) return { label: 'Strava', title: 'Imported from Strava' };
  if (file_type === 'image') return { label: 'Photo', title: 'Uploaded from screenshot' };
  if (file_type === 'gpx') return { label: 'GPX', title: 'Uploaded as GPX file' };
  if (file_type === 'fit') return { label: 'FIT', title: 'Uploaded as FIT file' };
  return { label: file_type.toUpperCase(), title: file_name };
}

function fastestMile(splits: number[] | null): number | null {
  if (!splits || splits.length === 0) return null;
  return Math.min(...splits);
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const th = 'px-2 py-2 text-left text-navy font-black uppercase tracking-wider text-xs opacity-70';
const td = 'px-2 py-2 text-xs';

export default function WorkoutTable({ workouts, raceDates = new Set() }: { workouts: Workout[]; raceDates?: Set<string> }) {
  const router = useRouter();

  const currentMonth = new Date().toISOString().slice(0, 7);

  // Group workouts by YYYY-MM, preserving order (newest first)
  const groups: { key: string; rows: Workout[] }[] = [];
  const seen = new Map<string, Workout[]>();
  for (const w of workouts) {
    const key = w.workout_date.slice(0, 7);
    if (!seen.has(key)) {
      seen.set(key, []);
      groups.push({ key, rows: seen.get(key)! });
    }
    seen.get(key)!.push(w);
  }

  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map(g => [g.key, g.key >= currentMonth]))
  );

  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

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
              <th className={`${th} hidden sm:table-cell`}>Fastest Mi</th>
              <th className={`${th} hidden sm:table-cell`}>Location</th>
              <th className={`${th} hidden sm:table-cell`}>Source</th>
              <th className={`${th} hidden sm:table-cell`}></th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ key, rows }) => {
              const isOpen = !!expanded[key];
              return (
                <>
                  {/* Month header row */}
                  <tr
                    key={`header-${key}`}
                    onClick={() => toggle(key)}
                    className={`cursor-pointer border-b-2 border-navy border-opacity-20 transition-colors ${isOpen ? 'bg-navy bg-opacity-5 hover:bg-opacity-10' : 'bg-navy bg-opacity-10 hover:bg-opacity-20'}`}
                  >
                    <td colSpan={9} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                            className={`text-navy opacity-60 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                            style={{ flexShrink: 0 }}
                          >
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                          <span className="text-navy font-black uppercase tracking-widest text-sm">
                            {monthLabel(key)}
                          </span>
                        </div>
                        <span className="text-navy opacity-40 text-xs font-semibold">
                          {rows.length} workout{rows.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Workout rows */}
                  {isOpen && rows.map((w, i) => {
                    const isRace = raceDates.has(w.workout_date.slice(0, 10)) && (w.distance_m ?? 0) >= 4828;
                    const btnClass = isRace
                      ? 'bg-terracotta text-white font-black uppercase tracking-wider px-2 py-1 rounded hover:opacity-80 transition-colors whitespace-nowrap'
                      : 'bg-navy text-white font-black uppercase tracking-wider px-2 py-1 rounded hover:bg-terracotta transition-colors whitespace-nowrap';
                    const btnLabel = isRace ? 'Race Details' : 'Details';
                    return (
                      <tr
                        key={w.id}
                        onClick={() => router.push(`/dashboard/workout/${w.id}`)}
                        className={`border-b border-navy border-opacity-10 cursor-pointer hover:bg-gold hover:bg-opacity-10 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-cream-light'}`}
                      >
                        <td className={`${td} text-navy font-bold`}>{w.name}</td>
                        <td className={`${td} text-navy opacity-70 whitespace-nowrap`}>{formatDate(w.workout_date)}</td>
                        <td className={`${td} text-gold font-bold whitespace-nowrap`}>{formatDistanceShort(w.distance_m)}</td>
                        <td className={`${td} sm:hidden`} onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => router.push(`/dashboard/workout/${w.id}`)} className={btnClass} style={{fontSize: '9px'}}>{btnLabel}</button>
                        </td>
                        <td className={`${td} text-navy opacity-70 whitespace-nowrap hidden sm:table-cell`}>{formatPace(w.avg_speed_ms ? 1609.344 / w.avg_speed_ms : null)}</td>
                        <td className={`${td} text-navy opacity-70 whitespace-nowrap hidden sm:table-cell`}>{formatPace(fastestMile(w.mile_splits))}</td>
                        <td className={`${td} text-navy opacity-60 italic hidden sm:table-cell max-w-[100px] truncate`}>{w.location || '—'}</td>
                        <td className={`${td} hidden sm:table-cell`} title={sourceLabel(w.file_name, w.file_type).title}>
                          <span className="text-xs font-bold uppercase tracking-wide opacity-50">{sourceLabel(w.file_name, w.file_type).label}</span>
                        </td>
                        <td className={`${td} hidden sm:table-cell`} onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => router.push(`/dashboard/workout/${w.id}`)} className={btnClass} style={{fontSize: '9px'}}>{btnLabel}</button>
                        </td>
                      </tr>
                    );
                  })}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
