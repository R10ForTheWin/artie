'use client';

import { useEffect, useState } from 'react';

interface Roster {
  enabled: boolean;
  me: string | null;
  isAdmin: boolean;
  usesHrMonitor: boolean;
  people: { name: string }[];
}

export default function PaddlerAdmin() {
  const [roster, setRoster] = useState<Roster | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth').then((r) => r.json()).then(setRoster).catch(() => setError('Could not load paddlers.'));
  }, []);

  async function setHr(on: boolean) {
    setRoster((r) => (r ? { ...r, usesHrMonitor: on } : r));
    const res = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'settings', usesHrMonitor: on }),
    });
    if (!res.ok) { setError('Could not save that.'); setRoster((r) => (r ? { ...r, usesHrMonitor: !on } : r)); }
  }

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

      {error && <p className="text-terracotta font-bold text-sm">{error}</p>}

      <label className="flex items-start gap-3 border-2 border-navy/20 rounded-xl p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={roster.usesHrMonitor}
          onChange={(e) => setHr(e.target.checked)}
          className="mt-0.5 w-5 h-5 accent-navy shrink-0"
        />
        <span>
          <span className="block text-navy font-bold text-sm">I wear a heart rate strap</span>
          <span className="block text-navy opacity-50 text-xs mt-0.5 leading-relaxed">
            Wrist heart rate is too far off to use, so ARTIE ignores it unless this is ticked.
          </span>
        </span>
      </label>

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
