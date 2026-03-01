import Link from 'next/link';
import UploadForm from '@/components/UploadForm';
import StripeBar from '@/components/StripeBar';

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar />

      <div className="flex-1 px-6 py-10 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider">
            ← Back
          </Link>
          <Link href="/dashboard" className="text-gold text-sm font-bold uppercase tracking-wider hover:text-terracotta">
            Dashboard →
          </Link>
        </div>

        <h1 className="text-navy font-black uppercase tracking-widest text-3xl mb-2">
          Upload Garmin File
        </h1>

        <div className="mb-8" />

        <UploadForm />
      </div>

      <StripeBar />
    </main>
  );
}
