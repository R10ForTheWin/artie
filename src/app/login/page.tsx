import { Suspense } from 'react';
import StripeBar from '@/components/StripeBar';
import LoginForm from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar />
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/artie-logo.png" alt="ARTIE" className="w-full h-auto mb-6" />
          <Suspense fallback={<p className="text-navy opacity-40 text-sm text-center">Loading…</p>}>
            <LoginForm />
          </Suspense>
          <p className="text-navy opacity-30 text-xs text-center mt-6 leading-relaxed">
            ARTIE remembers you on this device, so you should only need this once.
          </p>
        </div>
      </div>
      <StripeBar side="bottom" />
    </main>
  );
}
