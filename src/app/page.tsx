import Image from 'next/image';
import Link from 'next/link';
import StripeBar from '@/components/StripeBar';
import OceanTempCard from '@/components/OceanTempCard';
import SurfCard from '@/components/SurfCard';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar side="top" />

      <div className="flex-1 flex flex-col items-center px-6 pt-4 pb-4">
        {/* Logo */}
        <div className="w-full max-w-xs mb-2">
          <Image
            src="/artie-logo.png"
            alt="ARTIE"
            width={1825}
            height={862}
            className="w-full h-auto"
            priority
          />
        </div>

        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Link
            href="/dashboard"
            className="bg-navy text-white font-bold uppercase tracking-widest text-center py-2 px-6 rounded-lg text-xs hover:opacity-80 transition-opacity"
          >
            Mileage Tracker
          </Link>
          <Link
            href="/races"
            className="bg-sky text-white font-bold uppercase tracking-widest text-center py-2 px-6 rounded-lg text-xs hover:opacity-80 transition-opacity"
          >
            Races
          </Link>
          <Link
            href="/records"
            className="bg-gold text-white font-bold uppercase tracking-widest text-center py-2 px-6 rounded-lg text-xs hover:opacity-80 transition-opacity"
          >
            Records
          </Link>
          <Link
            href="/photos"
            className="bg-terracotta text-white font-bold uppercase tracking-widest text-center py-2 px-6 rounded-lg text-xs hover:opacity-80 transition-opacity"
          >
            Photos
          </Link>
        </div>

        <div className="w-full max-w-xs mt-2 flex flex-col gap-2">
          <OceanTempCard />
          <SurfCard />
        </div>
      </div>

      <StripeBar side="bottom" />
    </main>
  );
}
