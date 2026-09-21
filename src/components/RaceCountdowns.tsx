import Image from 'next/image';
import { formatDate, daysUntil } from '@/lib/formatters';
import { TEAMMATES, TEAMMATE_ALIASES, MATCH_ALIAS_ONLY, type Teammate } from '@/lib/teammates';
import SyncResultsButton from './SyncResultsButton';

interface Finisher {
  place: number;
  name: string;
  time: string;
  division?: string;
}

interface Race {
  id: number;
  name: string;
  race_date: string;
  location: string | null;
  logo: string | null;
  results: Finisher[] | null;
  paddleguru_url: string | null;
  course_record: string | null;
  distance_m: number | null;
  entry_price: string | null;
  details_confirmed: boolean;
}

function wordMatch(text: string, word: string): boolean {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
}

function isTeammate(name: string): boolean {
  return TEAMMATES.some((t) => {
    const nameMatch = !MATCH_ALIAS_ONLY.has(t) && wordMatch(name, t);
    const aliasMatch = (TEAMMATE_ALIASES[t] ?? []).some((alias) => wordMatch(name, alias));
    return nameMatch || aliasMatch;
  });
}

const HIGHLIGHT_COLORS = [
  'bg-gold/45',
  'bg-sky/45',
  'bg-terracotta/35',
] as const;

const CONTEXT_WINDOW = 3;

function contextRows(finishers: Finisher[]): (Finisher | null)[] {
  const keep = new Set<number>();
  finishers.forEach((f, i) => {
    if (isTeammate(f.name)) {
      for (let j = Math.max(0, i - CONTEXT_WINDOW); j <= Math.min(finishers.length - 1, i + CONTEXT_WINDOW); j++) {
        keep.add(j);
      }
    }
  });
  if (keep.size === 0) return finishers.slice(0, 5);
  const sorted = [...keep].sort((a, b) => a - b);
  const result: (Finisher | null)[] = [];
  let prev = -2;
  for (const idx of sorted) {
    if (prev >= 0 && idx > prev + 1) result.push(null); // gap sentinel
    result.push(finishers[idx]);
    prev = idx;
  }
  return result;
}

export default function RaceCountdowns({ races, workoutLinks = {} }: { races: Race[]; workoutLinks?: Record<string, Record<string, number>> }) {
  const upcoming = races.filter((r) => daysUntil(r.race_date) >= 0);
  const past = races.filter((r) => daysUntil(r.race_date) < 0).sort((a, b) => b.race_date.localeCompare(a.race_date));

  if (races.length === 0) {
    return (
      <div className="border-2 border-navy border-opacity-20 rounded-lg p-6">
        <h2 className="text-navy font-black uppercase tracking-widest text-lg mb-3">Races</h2>
        <p className="text-navy opacity-40 text-sm">No races scheduled yet.</p>
        <a href="/races/new" className="inline-block mt-3 text-gold text-sm underline hover:text-terracotta">
          + Add a Race
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Races */}
      <div className="border-2 border-navy border-opacity-20 rounded-lg p-6 bg-white">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-navy font-black uppercase tracking-widest text-lg">Upcoming Races</h2>
          <a href="/races/new" className="text-gold text-sm font-bold underline hover:text-terracotta">+ Add Race</a>
        </div>

        <div className="space-y-3">
          {upcoming.length === 0 ? (
            <p className="text-navy opacity-40 text-sm">No upcoming races.</p>
          ) : upcoming.map((race) => {
            const days = daysUntil(race.race_date);
            return (
              <div key={race.id} className="border border-navy/10 rounded-xl px-4 py-4 bg-sky/10">
                <div className="flex items-center justify-between gap-4">
                  <Image src={race.logo ?? '/default-race.jpg'} alt={race.name} width={80} height={80} className="flex-shrink-0 object-contain" />
                  <div className="flex-shrink-0">
                    {days === 0 ? (
                      <p className="text-terracotta font-black text-lg uppercase">Today!</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {String(days).padStart(2, '0').split('').map((d, i) => (
                            <div key={i} className="relative w-9 h-11 bg-navy rounded flex items-center justify-center overflow-hidden shadow">
                              <div className="absolute inset-x-0 top-0 h-1/2 bg-white/10" />
                              <div className="absolute inset-x-0 top-1/2 h-px bg-black/40 z-10" />
                              <span className="text-white font-black text-2xl leading-none z-20">{d}</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-left leading-none">
                          <p className="text-navy font-black text-xs uppercase tracking-wide">Days</p>
                          <p className="text-navy font-black text-xs uppercase tracking-wide mt-0.5">To Go</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-navy font-bold text-base">{race.name}</p>
                    {!race.details_confirmed && (
                      <span className="px-2 py-0.5 rounded-full bg-navy/10 text-navy text-[10px] font-black uppercase tracking-wider">
                        Not yet confirmed
                      </span>
                    )}
                  </div>
                  <p className="text-navy text-xs opacity-40 mt-0.5">{formatDate(race.race_date)}</p>
                  <dl className="mt-2 space-y-0.5 text-xs">
                    <div className="flex gap-2">
                      <dt className="text-navy opacity-40 w-16 shrink-0">Where</dt>
                      <dd className="text-navy opacity-70">{race.location ?? 'TBC'}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-navy opacity-40 w-16 shrink-0">Distance</dt>
                      <dd className="text-navy opacity-70">
                        {race.distance_m ? `${(race.distance_m / 1609.344).toFixed(1)} mi` : 'TBC'}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-navy opacity-40 w-16 shrink-0">Entry</dt>
                      <dd className="text-navy opacity-70">{race.entry_price ?? 'TBC'}</dd>
                    </div>
                  </dl>
                  {!race.details_confirmed && (
                    <p className="text-navy opacity-30 text-[11px] mt-2 leading-relaxed">
                      Carried over from last season — the organisers haven&apos;t posted {new Date(race.race_date).getUTCFullYear()} details yet.
                    </p>
                  )}
                </div>
                {race.course_record && (
                  <p className="text-navy text-xs opacity-40 mt-2 pt-2 border-t border-navy/10">CR: {race.course_record}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Previous Races */}
      {past.length > 0 && (
        <div className="border-2 border-navy border-opacity-20 rounded-lg p-6 bg-white">
          <h2 className="text-navy font-black uppercase tracking-widest text-lg mb-5">Previous Races</h2>
          <div className="space-y-6">
            {past.map((race, raceIdx) => (
              /* <details> keeps this a server component — no client JS needed to collapse */
              <details key={race.id} className="group">
                <summary className="flex items-center gap-3 mb-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden rounded hover:bg-navy/5 transition-colors">
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                    className="shrink-0 text-navy opacity-60 transition-transform group-open:rotate-90"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <Image src={race.logo ?? '/default-race.jpg'} alt={race.name} width={70} height={70} className="flex-shrink-0 object-contain" />
                  <div className="min-w-0">
                    <p className="text-navy font-bold text-base">{race.name}</p>
                    {race.location && <p className="text-navy text-xs opacity-50">{race.location}</p>}
                    <p className="text-navy text-xs opacity-40">{formatDate(race.race_date)}</p>
                  </div>
                </summary>

                {race.results && race.results.length > 0 && (() => {
                  const dateKey = race.race_date.slice(0, 10);
                  const byName = workoutLinks[dateKey] ?? {};
                  const hasDivisions = race.results.some((f) => f.division);
                  const highlightColor = HIGHLIGHT_COLORS[raceIdx % HIGHLIGHT_COLORS.length];

                  const renderTable = (finishers: Finisher[]) => {
                    const rows = contextRows(finishers);
                    return (
                      <table className="w-full text-sm">
                        <tbody>
                          {rows.map((f, ri) => {
                            if (!f) {
                              return (
                                <tr key={`gap-${ri}`}>
                                  <td colSpan={3} className="py-0.5 px-2 text-navy opacity-20 text-xs text-center">· · ·</td>
                                </tr>
                              );
                            }
                            const highlight = isTeammate(f.name);
                            const workoutId = highlight
                              ? Object.entries(byName).find(([n]) => {
                                  const teammate = n as Teammate;
                                  if (wordMatch(f.name, n)) return true;
                                  return (TEAMMATE_ALIASES[teammate] ?? []).some((alias) => wordMatch(f.name, alias));
                                })?.[1]
                              : undefined;
                            return (
                              <tr key={`${f.division ?? ''}-${f.place}-${f.name}`} className={highlight ? `${highlightColor} rounded` : ''}>
                                <td className={`py-1 px-2 w-8 font-bold tabular-nums ${highlight ? 'text-navy' : 'text-navy opacity-30'}`}>{f.place}</td>
                                <td className={`py-1 px-2 flex-1 ${highlight ? 'font-bold text-navy' : 'text-navy opacity-60'}`}>
                                  {workoutId ? (
                                    <a href={`/dashboard/workout/${workoutId}`} className="underline hover:text-gold transition-colors">{f.name}</a>
                                  ) : f.name}
                                </td>
                                <td className={`py-1 px-2 text-right tabular-nums ${highlight ? 'text-navy font-bold' : 'text-navy opacity-40'}`}>{f.time}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  };

                  if (hasDivisions) {
                    const groups = race.results.reduce((acc, f) => {
                      const key = f.division ?? '';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(f);
                      return acc;
                    }, {} as Record<string, Finisher[]>);
                    // Only show divisions containing at least one teammate
                    const teammateGroups = Object.entries(groups).filter(([, finishers]) =>
                      finishers.some((f) => isTeammate(f.name))
                    );
                    return (
                      <div className="space-y-4">
                        {teammateGroups.map(([division, finishers]) => (
                          <div key={division}>
                            <p className="text-navy text-xs uppercase tracking-widest opacity-40 mb-2">{division || 'Results'}</p>
                            {renderTable(finishers)}
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <div>
                      <p className="text-navy text-xs uppercase tracking-widest opacity-40 mb-2">Prone Open</p>
                      {renderTable(race.results)}
                    </div>
                  );
                })()}
                {race.course_record && (
                  <p className="text-navy text-xs opacity-40 mt-2 pt-2 border-t border-navy/10">CR: {race.course_record}</p>
                )}
                {race.paddleguru_url && (!race.results || race.results.length === 0) && (
                  <SyncResultsButton raceId={race.id} />
                )}
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
