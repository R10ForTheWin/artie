'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function SwipeBack({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    }

    function onTouchEnd(e: TouchEvent) {
      if (startX.current === null || startY.current === null) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      // Swipe left: skip if touch originated inside a scrollable container
      const target = e.target as HTMLElement;
      const inScrollable = target.closest('[data-swipe-ignore]');
      if (!inScrollable && dx < -40 && Math.abs(dx) > Math.abs(dy)) {
        router.back();
      }
      startX.current = null;
      startY.current = null;
    }

    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [router]);

  return <>{children}</>;
}
