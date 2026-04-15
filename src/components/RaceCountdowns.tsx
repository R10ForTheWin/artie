import Image from 'next/image';
import { formatDate, daysUntil } from '@/lib/formatters';
import { TEAMMATES } from '@/lib/teammates';
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
}

function isTeammate(name: string): boolean {
  return TEAMMATES.some((t) => name.toLowerCase().includes(t.toLowerCase()));
}

export default function RaceCountdowns({ races, workoutLinks = {} }: { races: Race[]; workoutLinks?: Record<string, Record<string, number>> }) {
  const upcoming = races.filter((r) => daysUntil(r.race_date) >= 0);
  const past = races.filter((r) => daysUntil(r.race_date) < 0);

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
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden bg-white border border-navy border-opacity-10 flex items-center justify-center p-2">
                    <Image src={race.logo ?? '/default-race.jpg'} alt={race.name} width={72} height={72} className="object-contain w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-navy font-bold text-lg">{race.name}</p>
                    {race.location && <p className="text-navy text-xs opacity-50">{race.location}</p>}
                    <p className="text-navy text-xs opacity-40 mt-0.5">{formatDate(race.race_date)}</p>
                  </div>
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
            {past.map((race) => (
              <div key={race.id}>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-shrink-0 w-[56px] h-[56px] rounded-xl overflow-hidden bg-white border border-navy border-opacity-10 flex items-center justify-center p-2">
                    <Image src={race.logo ?? '/default-race.jpg'} alt={race.name} width={56} height={56} className="object-contain w-full h-full" />
                  </div>
                  <div>
                    <p className="text-navy font-bold text-base">{race.name}</p>
                    {race.location && <p className="text-navy text-xs opacity-50">{race.location}</p>}
                    <p className="text-navy text-xs opacity-40">{formatDate(race.race_date)}</p>
                  </div>
                </div>

                {race.results && race.results.length > 0 && (() => {
                  const dateKey = race.race_date.slice(0, 10);
                  const byName = workoutLinks[dateKey] ?? {};
                  const hasDivisions = race.results.some((f) => f.division);

                  const renderTable = (finishers: Finisher[]) => (
                    <table className="w-full text-sm">
                      <tbody>
                        {finishers.map((f) => {
                          const highlight = isTeammate(f.name);
                          const workoutId = highlight
                            ? Object.entries(byName).find(([n]) => f.name.toLowerCase().includes(n.toLowerCase()))?.[1]
                            : undefined;
                          return (
                            <tr key={`${f.division ?? ''}-${f.place}-${f.name}`} className={highlight ? 'bg-gold bg-opacity-20 rounded' : ''}>
                              <td className={`py-1 px-2 w-8 font-bold tabular-nums ${highlight ? 'text-gold' : 'text-navy opacity-30'}`}>{f.place}</td>
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
                {race.paddleguru_url && (
                  <SyncResultsButton raceId={race.id} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
