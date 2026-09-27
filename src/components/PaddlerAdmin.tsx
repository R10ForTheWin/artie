'use client';

import { useEffect, useState } from 'react';

interface Roster {
  enabled: boolean;
  me: string | null;
  isAdmin: boolean;
  people: { name: string }[];
}

export default function PaddlerAdmin() {
  const [roster, setRoster] = useState<Roster | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth').then((r) => r.json()).then(setRoster).catch(() => setError('Could not load paddlers.'));
  }, []);

  async function doLogout() {
    await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }),
    });
    window.location.href = '/login';
  }

  if (!roster?.enabled) return error ? <p className="text-terracotta font-bold text-sm">{error}</p> : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-navy text-sm">
          Signed in as <strong>{roster.me}</strong>
        </p>
        <button onClick={doLogout} className="text-navy opacity-50 hover:opacity-100 text-xs font-bold uppercase tracking-wider">
          Sign out
        </button>
      </div>

      {roster.isAdmin && (
        <div className="border-2 border-navy/20 rounded-xl p-4">
          <p className="text-navy font-black uppercase tracking-widest text-sm mb-3">Paddlers</p>
          <ul className="divide-y divide-navy/10">
            {roster.people.map((p) => (
              <li key={p.name} className="py-2 text-navy text-sm">
                {p.name}
                {p.name === roster.me && <span className="ml-2 text-navy opacity-40 text-xs">you</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
