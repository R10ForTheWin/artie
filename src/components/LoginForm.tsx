'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Mode = 'signin' | 'join';

/**
 * Two doors, both visible: Sign in for the crew, Join for someone new. Names
 * are typed rather than picked from a list, so a visitor never sees who is on
 * the team — and a newcomer isn't left thinking they must already be on it.
 */
export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pin, setPin] = useState('');
  const [teamCode, setTeamCode] = useState('');
  // Signing in for the first time sets a PIN, which the server only allows
  // with the team code. It says so, and the field appears then.
  const [askCode, setAskCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const remembered = localStorage.getItem('artie_csv_name');
      if (remembered) setName(remembered);
    } catch { /* private mode */ }
  }, []);

  function switchTo(m: Mode) {
    setMode(m);
    setError('');
    setPin('');
    setAskCode(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'join'
            ? { action: 'join', name, lastName, pin, teamCode }
            : { name, pin, ...(askCode ? { teamCode } : {}) }
        ),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.needsTeamCode) setAskCode(true);
        setError(json.error ?? 'That did not work.');
        return;
      }
      try { localStorage.setItem('artie_csv_name', json.name); } catch { /* private mode */ }
      router.replace(next);
      router.refresh();
    } catch {
      setError('Could not reach ARTIE.');
    } finally {
      setBusy(false);
    }
  }

  const field = 'w-full bg-white border-2 border-navy text-navy rounded-lg px-4 py-3 font-semibold focus:outline-none focus:border-gold';
  const joining = mode === 'join';
  const showCode = joining || askCode;
  const ready =
    pin.length >= 4 &&
    name.trim().length >= 2 &&
    (!joining || lastName.trim().length >= 2) &&
    (!showCode || teamCode.trim().length > 0);

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => switchTo(m)}
      aria-pressed={mode === m}
      className={`flex-1 py-2.5 rounded-md text-xs font-black uppercase tracking-widest transition-colors ${
        mode === m ? 'bg-navy text-white' : 'text-navy opacity-60 hover:opacity-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex gap-1 p-1 rounded-lg bg-navy/10">
        {tab('signin', 'Sign in')}
        {tab('join', 'New? Join')}
      </div>

      {joining && (
        <p className="text-navy opacity-60 text-sm leading-relaxed">
          Get the team code from the crew, then pick a PIN. Your last name is how ARTIE finds you in race results.
        </p>
      )}

      {showCode && (
        <input
          type="text"
          value={teamCode}
          onChange={(e) => { setTeamCode(e.target.value); setError(''); }}
          placeholder="Team code"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={field}
        />
      )}

      <input
        type="text"
        value={name}
        onChange={(e) => { setName(e.target.value); setError(''); }}
        placeholder={joining ? 'First name — how the crew knows you' : 'Your name'}
        autoComplete={joining ? 'given-name' : 'username'}
        autoCapitalize="words"
        className={field}
      />

      {joining && (
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last name"
          autoComplete="family-name"
          autoCapitalize="words"
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
          placeholder={joining || askCode ? 'Choose a PIN (4–8 digits)' : 'Your PIN'}
          autoComplete={joining || askCode ? 'new-password' : 'current-password'}
          className={field}
        />
        {(joining || askCode) && (
          <p className="text-navy opacity-50 text-xs mt-1.5 leading-relaxed">
            Pick any 4–8 digits. You will only need it again on a new phone or browser.
          </p>
        )}
      </div>

      {error && <p className="text-terracotta font-bold text-sm">{error}</p>}

      <button
        type="submit"
        disabled={busy || !ready}
        className="w-full bg-navy text-white font-black uppercase tracking-widest py-3 rounded-lg hover:bg-terracotta transition-colors disabled:opacity-40"
      >
        {busy ? 'One sec…' : joining ? 'Join ARTIE' : askCode ? 'Set my PIN' : 'Sign in'}
      </button>
    </form>
  );
}
