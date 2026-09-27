import Link from 'next/link';
import StripeBar from '@/components/StripeBar';

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar />
      <div className="flex-1 px-6 pt-10 pb-10 max-w-2xl mx-auto w-full">
        <Link href="/" className="text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider">
          ← Home
        </Link>
        <h1 className="text-navy font-black uppercase tracking-widest text-3xl mt-6 mb-6">News</h1>
        <p className="text-navy opacity-50 text-sm">Articles to come.</p>
      </div>
      <StripeBar side="bottom" />
    </main>
  );
}
