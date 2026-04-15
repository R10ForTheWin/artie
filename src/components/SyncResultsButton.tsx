'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SyncResultsButton({ raceId }: { raceId: number }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSync() {
    setState('loading');
    setError('');
    try {
      const res = await fetch(`/api/races/${raceId}/sync-results`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Sync failed');
        setState('error');
      } else {
        router.refresh();
        setState('idle');
      }
    } catch {
      setError('Network error');
      setState('error');
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={handleSync}
        disabled={state === 'loading'}
        className="w-full py-3 px-4 rounded-xl border-2 border-navy border-opacity-20 text-sm font-bold text-navy opacity-60 hover:opacity-100 active:opacity-100 disabled:opacity-30 disabled:cursor-wait transition-opacity text-center"
      >
        {state === 'loading' ? 'Syncing...' : 'Sync results from PaddleGuru'}
      </button>
      {state === 'error' && (
        <p className="text-xs text-terracotta mt-1">{error}</p>
      )}
    </div>
  );
}
