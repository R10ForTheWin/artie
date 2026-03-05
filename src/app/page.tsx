import Image from 'next/image';
import Link from 'next/link';
import StripeBar from '@/components/StripeBar';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar side="top" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo — bigger, no shadow */}
        <div className="mb-6">
          <Image
            src="/logo-v3.png"
            alt="ARTIE"
            width={560}
            height={280}
            priority
          />
        </div>

        <p className="text-navy font-black uppercase tracking-widest text-sm mb-10">
          Artie
        </p>

        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Link
            href="/dashboard"
            className="bg-navy text-white font-bold uppercase tracking-widest text-center py-2.5 px-6 rounded-lg text-xs hover:bg-terracotta transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/upload"
            className="border-2 border-navy text-navy font-bold uppercase tracking-widest text-center py-2.5 px-6 rounded-lg text-xs hover:bg-navy hover:text-white transition-colors"
          >
            Upload Garmin File
          </Link>
        </div>
      </div>

      <StripeBar side="bottom" />
    </main>
  );
}
