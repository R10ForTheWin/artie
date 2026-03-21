import Image from 'next/image';
import { formatDate, daysUntil } from '@/lib/formatters';
import { TEAMMATES } from '@/lib/teammates';

interface Finisher {
  place: number;
  name: string;
  time: string;
}

interface Race {
  id: number;
  name: string;
  race_date: string;
  location: string | null;
  logo: string | null;
  results: Finisher[] | null;
}

function isTeammate(name: string): boolean {
  return TEAMMATES.some((t) => name.toLowerCase().includes(t.toLowerCase()));
}

export default function RaceCountdowns({ races }: { races: Race[] }) {
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
              <div key={race.id} className="flex items-center gap-4 border-2 border-navy border-opacity-10 rounded-xl px-4 py-4 bg-cream-light">
                <div className="flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden bg-white border border-navy border-opacity-10 flex items-center justify-center p-2">
                  <Image src={race.logo ?? '/default-race.jpg'} alt={race.name} width={72} height={72} className="object-contain w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-navy font-bold text-lg">{race.name}</p>
                  {race.location && <p className="text-navy text-xs opacity-50">{race.location}</p>}
                  <p className="text-navy text-xs opacity-40 mt-0.5">{formatDate(race.race_date)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {days === 0 ? (
                    <p className="text-terracotta font-black text-lg uppercase">Today!</p>
                  ) : (
                    <>
                      <p className="text-gold font-black text-4xl leading-none">{days}</p>
                      <p className="text-navy text-xs uppercase tracking-wider opacity-50 mt-1">days away</p>
                    </>
                  )}
                </div>
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

                {race.results && race.results.length > 0 && (
                  <div>
                    <p className="text-navy text-xs uppercase tracking-widest opacity-40 mb-2">Prone Open</p>
                    <table className="w-full text-sm">
                      <tbody>
                        {race.results.map((f) => {
                          const highlight = isTeammate(f.name);
                          return (
                            <tr
                              key={f.place}
                              className={highlight ? 'bg-gold bg-opacity-20 rounded' : ''}
                            >
                              <td className={`py-1 px-2 w-8 font-bold tabular-nums ${highlight ? 'text-gold' : 'text-navy opacity-30'}`}>
                                {f.place}
                              </td>
                              <td className={`py-1 px-2 flex-1 font-${highlight ? 'bold' : 'normal'} ${highlight ? 'text-navy' : 'text-navy opacity-60'}`}>
                                {f.name}
                              </td>
                              <td className={`py-1 px-2 text-right tabular-nums ${highlight ? 'text-navy font-bold' : 'text-navy opacity-40'}`}>
                                {f.time}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
