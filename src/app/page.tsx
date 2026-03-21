import Image from 'next/image';
import Link from 'next/link';
import StripeBar from '@/components/StripeBar';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar side="top" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 -mt-4">
        {/* Logo — bigger, no shadow */}
        <div className="mb-4">
          <Image
            src="/logo-v3.png"
            alt="ARTIE"
            width={280}
            height={140}
            priority
          />
        </div>


        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Link
            href="/dashboard"
            className="bg-navy text-white font-bold uppercase tracking-widest text-center py-2.5 px-6 rounded-lg text-xs hover:opacity-80 transition-opacity"
          >
            Mileage Tracker
          </Link>
          <Link
            href="/races"
            className="bg-sky text-white font-bold uppercase tracking-widest text-center py-2.5 px-6 rounded-lg text-xs hover:opacity-80 transition-opacity"
          >
            Races
          </Link>
          <Link
            href="/records"
            className="bg-gold text-white font-bold uppercase tracking-widest text-center py-2.5 px-6 rounded-lg text-xs hover:opacity-80 transition-opacity"
          >
            Records
          </Link>
          <Link
            href="/photos"
            className="bg-terracotta text-white font-bold uppercase tracking-widest text-center py-2.5 px-6 rounded-lg text-xs hover:opacity-80 transition-opacity"
          >
            Photos
          </Link>
        </div>
      </div>

      <StripeBar side="bottom" />
    </main>
  );
}
