'use client';

import { useEffect, useState } from 'react';

interface Roster {
  enabled: boolean;
  me: string | null;
  isAdmin: boolean;
  people: { name: string; needsPin: boolean }[];
}

export default function PaddlerAdmin() {
  const [roster, setRoster] = useState<Roster | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');

  const load = () => fetch('/api/auth').then((r) => r.json()).then(setRoster).catch(() => setError('Could not load paddlers.'));
  useEffect(() => { load(); }, []);

  async function post(body: Record<string, unknown>) {
    setError(''); setNote('');
    const res = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? 'That did not work.'); return false; }
    return true;
  }

  async function doReset(name: string) {
    if (await post({ action: 'reset', name })) {
      setNote(`${name}'s PIN is cleared — the next PIN they type becomes their new one.`);
      setConfirming(null);
      load();
    }
  }

  async function doChange(e: React.FormEvent) {
    e.preventDefault();
    if (await post({ action: 'change', pin, newPin })) {
      setNote('Your PIN is updated.');
      setPin(''); setNewPin('');
    }
  }

  async function doLogout() {
    await post({ action: 'logout' });
    window.location.href = '/login';
  }

  if (!roster?.enabled) return null;

  const field = 'w-full bg-white border-2 border-navy/30 text-navy rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:border-gold';

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

      {note && <p className="text-green-700 font-bold text-sm">{note}</p>}
      {error && <p className="text-terracotta font-bold text-sm">{error}</p>}

      <form onSubmit={doChange} className="border-2 border-navy/20 rounded-xl p-4 space-y-3">
        <p className="text-navy font-black uppercase tracking-widest text-sm">Change your PIN</p>
        <input type="password" inputMode="numeric" value={pin} placeholder="Current PIN"
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))} className={field} />
        <input type="password" inputMode="numeric" value={newPin} placeholder="New PIN (4–8 digits)"
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))} className={field} />
        <button type="submit" disabled={pin.length < 4 || newPin.length < 4}
          className="w-full bg-navy text-white font-black uppercase tracking-widest py-2.5 rounded-lg hover:bg-terracotta transition-colors disabled:opacity-40 text-sm">
          Update PIN
        </button>
      </form>

      {roster.isAdmin && (
        <div className="border-2 border-navy/20 rounded-xl p-4">
          <p className="text-navy font-black uppercase tracking-widest text-sm mb-1">Paddlers</p>
          <p className="text-navy opacity-50 text-xs mb-3 leading-relaxed">
            Resetting clears someone&apos;s PIN. The next one they type becomes their new PIN — no email needed.
          </p>
          <ul className="divide-y divide-navy/10">
            {roster.people.map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-3 py-2">
                <span className="text-navy text-sm">
                  {p.name}
                  {p.needsPin && <span className="ml-2 text-navy opacity-40 text-xs">no PIN set</span>}
                  {p.name === roster.me && <span className="ml-2 text-navy opacity-40 text-xs">you</span>}
                </span>
                {p.name !== roster.me && (
                  confirming === p.name ? (
                    <span className="flex gap-2 shrink-0">
                      <button onClick={() => doReset(p.name)} className="text-terracotta font-bold text-xs uppercase tracking-wider">Confirm</button>
                      <button onClick={() => setConfirming(null)} className="text-navy opacity-50 text-xs uppercase tracking-wider">Cancel</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirming(p.name)} disabled={p.needsPin}
                      className="text-navy opacity-50 hover:opacity-100 text-xs font-bold uppercase tracking-wider disabled:opacity-20 shrink-0">
                      Reset PIN
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
