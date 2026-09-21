'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Roster {
  enabled: boolean;
  me: string | null;
  people: { name: string; needsPin: boolean }[];
}

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';

  const [roster, setRoster] = useState<Roster | null>(null);
  const [mode, setMode] = useState<'signin' | 'join'>('signin');
  const [name, setName] = useState('');
  const [newName, setNewName] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth')
      .then((r) => r.json())
      .then((d: Roster) => {
        setRoster(d);
        const remembered = localStorage.getItem('artie_csv_name');
        if (remembered && d.people.some((p) => p.name === remembered)) setName(remembered);
      })
      .catch(() => setError('Could not reach ARTIE.'));
  }, []);

  const person = roster?.people.find((p) => p.name === name);
  const settingNewPin = mode === 'signin' && person?.needsPin;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'join' ? { action: 'join', name: newName, pin } : { name, pin }
        ),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'That did not work.'); return; }
      localStorage.setItem('artie_csv_name', json.name);
      router.replace(next);
      router.refresh();
    } catch {
      setError('Could not reach ARTIE.');
    } finally {
      setBusy(false);
    }
  }

  const field = 'w-full bg-white border-2 border-navy text-navy rounded-lg px-4 py-3 font-semibold focus:outline-none focus:border-gold';

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === 'signin' ? (
        <select value={name} onChange={(e) => { setName(e.target.value); setError(''); }} className={`${field} appearance-none`}>
          <option value="">Who are you?</option>
          {roster?.people.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
      ) : (
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          className={field}
        />
      )}

      <div>
        <input
          type="password"
          inputMode="numeric"
          pattern="\d*"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder={settingNewPin || mode === 'join' ? 'Choose a PIN (4–8 digits)' : 'Your PIN'}
          autoComplete={settingNewPin || mode === 'join' ? 'new-password' : 'current-password'}
          className={field}
        />
        {(settingNewPin || mode === 'join') && (
          <p className="text-navy opacity-50 text-xs mt-1.5 leading-relaxed">
            {mode === 'join'
              ? 'Pick any 4–8 digits. You will only need it again on a new phone or browser.'
              : 'First time in — whatever you type now becomes your PIN.'}
          </p>
        )}
      </div>

      {error && <p className="text-terracotta font-bold text-sm">{error}</p>}

      <button
        type="submit"
        disabled={busy || pin.length < 4 || (mode === 'signin' ? !name : newName.trim().length < 2)}
        className="w-full bg-navy text-white font-black uppercase tracking-widest py-3 rounded-lg hover:bg-terracotta transition-colors disabled:opacity-40"
      >
        {busy ? 'One sec…' : mode === 'join' ? 'Join ARTIE' : settingNewPin ? 'Set my PIN' : 'Sign in'}
      </button>

      <button
        type="button"
        onClick={() => { setMode(mode === 'join' ? 'signin' : 'join'); setError(''); setPin(''); }}
        className="w-full text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider transition-opacity"
      >
        {mode === 'join' ? '← Sign in instead' : "New paddler? Add yourself"}
      </button>
    </form>
  );
}
