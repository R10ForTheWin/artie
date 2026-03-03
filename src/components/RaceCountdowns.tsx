import Image from 'next/image';
import { formatDate, daysUntil } from '@/lib/formatters';

interface Race {
  id: number;
  name: string;
  race_date: string;
  location: string | null;
  logo: string | null;
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
    <div className="border-2 border-navy border-opacity-20 rounded-lg p-6 bg-white">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-navy font-black uppercase tracking-widest text-lg">Upcoming Races</h2>
        <a href="/races/new" className="text-gold text-sm font-bold underline hover:text-terracotta">+ Add Race</a>
      </div>

      <div className="space-y-3">
        {upcoming.map((race) => {
          const days = daysUntil(race.race_date);
          return (
            <div key={race.id} className="flex items-center gap-4 border-2 border-navy border-opacity-10 rounded-xl px-4 py-4 bg-cream-light">
              <div className="flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden bg-white border border-navy border-opacity-10 flex items-center justify-center p-1">
                {race.logo ? (
                  <Image src={race.logo} alt={race.name} width={72} height={72} className="object-contain w-full h-full" />
                ) : (
                  <span className="text-navy font-black text-lg">{race.name.charAt(0)}</span>
                )}
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

        {past.length > 0 && (
          <div className="mt-4">
            <p className="text-navy text-xs uppercase tracking-wider opacity-30 mb-2">Completed</p>
            {past.map((race) => (
              <div key={race.id} className="flex items-center gap-3 px-4 py-2 opacity-30">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-navy flex items-center justify-center flex-shrink-0">
                {race.logo
                  ? <Image src={race.logo} alt={race.name} width={32} height={32} className="object-cover w-full h-full" />
                  : <span className="text-cream font-black text-xs">{race.name.charAt(0)}</span>}
              </div>
                <div className="flex-1">
                  <p className="text-navy text-sm">{race.name}</p>
                </div>
                <p className="text-navy text-xs">{formatDate(race.race_date)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
