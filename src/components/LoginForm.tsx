'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Mode = 'signin' | 'join';

/**
 * Two doors, both visible: Sign in for the crew, Join for someone new. The
 * team code is the only thing to know — no PIN. Names are typed rather than
 * picked from a list, so a visitor never sees who is on the team, and a
 * newcomer isn't left thinking they must already be on it.
 */
export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [teamCode, setTeamCode] = useState('');
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
          mode === 'join' ? { action: 'join', name, lastName, teamCode } : { name, teamCode }
        ),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'That did not work.'); return; }
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
  const ready =
    teamCode.trim().length > 0 &&
    name.trim().length >= 2 &&
    (!joining || lastName.trim().length >= 2);

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
          Get the team code from the crew. Your last name is how ARTIE finds you in race results.
        </p>
      )}

      <input
        type="text"
        value={name}
        onChange={(e) => { setName(e.target.value); setError(''); }}
        placeholder={joining ? 'First name' : 'Your name'}
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

      {error && <p className="text-terracotta font-bold text-sm">{error}</p>}

      <button
        type="submit"
        disabled={busy || !ready}
        className="w-full bg-navy text-white font-black uppercase tracking-widest py-3 rounded-lg hover:bg-terracotta transition-colors disabled:opacity-40"
      >
        {busy ? 'One sec…' : joining ? 'Join ARTIE' : 'Sign in'}
      </button>
    </form>
  );
}
