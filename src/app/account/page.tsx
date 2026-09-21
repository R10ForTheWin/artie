import Link from 'next/link';
import StripeBar from '@/components/StripeBar';
import PaddlerAdmin from '@/components/PaddlerAdmin';

export const dynamic = 'force-dynamic';

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar />
      <div className="flex-1 px-6 py-10 max-w-lg mx-auto w-full">
        <div className="mb-8">
          <Link href="/" className="text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider">
            ← Home
          </Link>
        </div>
        <h1 className="text-navy font-black uppercase tracking-widest text-3xl mb-6">Account</h1>
        <PaddlerAdmin />
      </div>
      <StripeBar side="bottom" />
    </main>
  );
}
