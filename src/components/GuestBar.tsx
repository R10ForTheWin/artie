'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** A slim reminder, shown only to someone who skipped signing up. */
export default function GuestBar() {
  const pathname = usePathname();
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    setGuest(document.cookie.split('; ').includes('artie_guest=1'));
  }, [pathname]);

  if (!guest || pathname === '/login') return null;
  return (
    <div className="bg-cream-light border-b border-navy/10 text-navy text-xs text-center px-4 py-2">
      You&apos;re looking around as a guest.{' '}
      <Link href="/login?join=1" className="font-black underline">Sign up</Link> to add your workouts.
    </div>
  );
}
