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
        className="text-xs text-navy opacity-40 hover:opacity-70 underline disabled:cursor-wait transition-opacity"
      >
        {state === 'loading' ? 'Syncing...' : 'Sync results from PaddleGuru'}
      </button>
      {state === 'error' && (
        <p className="text-xs text-terracotta mt-1">{error}</p>
      )}
    </div>
  );
}
