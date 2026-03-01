'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StripeBar from '@/components/StripeBar';

export default function NewRacePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/races', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, race_date: date, location: location || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add race');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar side="top" />
      <div className="flex-1 px-6 py-10 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard" className="text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider">
            ← Dashboard
          </Link>
        </div>

        <h1 className="text-navy font-black uppercase tracking-widest text-3xl mb-2">Add a Race</h1>

        <div className="my-5">
          <StripeBar side="top" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-navy font-black uppercase tracking-widest text-sm mb-2">
              Race Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Catalina Classic"
              className="w-full bg-white border-2 border-navy text-navy rounded-lg px-4 py-3 focus:outline-none focus:border-gold placeholder-navy placeholder-opacity-30"
            />
          </div>

          <div>
            <label className="block text-navy font-black uppercase tracking-widest text-sm mb-2">
              Race Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-white border-2 border-navy text-navy rounded-lg px-4 py-3 focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-navy font-black uppercase tracking-widest text-sm mb-2">
              Location <span className="text-navy opacity-40 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Isthmus, Catalina to Manhattan Beach"
              className="w-full bg-white border-2 border-navy text-navy rounded-lg px-4 py-3 focus:outline-none focus:border-gold placeholder-navy placeholder-opacity-30"
            />
          </div>

          {error && (
            <p className="text-terracotta border border-terracotta rounded-lg px-4 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name || !date}
            className="w-full bg-navy text-white font-black uppercase tracking-widest py-4 rounded-lg text-lg hover:bg-terracotta transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Add Race'}
          </button>
        </form>
      </div>
      <StripeBar side="bottom" />
    </main>
  );
}
