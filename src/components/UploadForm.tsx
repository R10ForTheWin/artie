'use client';

import { useState, useEffect } from 'react';
import { TEAMMATES } from '@/lib/teammates';
import { COURSES } from '@/lib/courses';
import { formatDistance, formatDuration, formatSpeed, formatHr, formatCalories } from '@/lib/formatters';

interface WorkoutResult {
  name: string;
  workout_date: string;
  distance_m: number | null;
  duration_s: number | null;
  avg_speed_ms: number | null;
  avg_hr: number | null;
  calories: number | null;
}

export default function UploadForm() {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkoutResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            const ext = item.type === 'image/png' ? 'png' : 'jpg';
            setFile(new File([blob], `screenshot.${ext}`, { type: item.type }));
          }
          break;
        }
      }
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !file) return;
    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('location', location);
    formData.append('file', file);

    try {
      const res = await fetch('/api/workouts', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-navy font-black uppercase tracking-widest text-sm mb-2">
              Select Your Name
            </label>
            <select
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-white border-2 border-navy text-navy rounded-lg px-4 py-3 font-semibold focus:outline-none focus:border-gold appearance-none"
            >
              <option value="">— Choose teammate —</option>
              {TEAMMATES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-navy font-black uppercase tracking-widest text-sm mb-2">
              Location <span className="text-navy opacity-40 font-normal normal-case tracking-normal text-xs">(optional)</span>
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-white border-2 border-navy text-navy rounded-lg px-4 py-3 font-semibold focus:outline-none focus:border-gold appearance-none"
            >
              <option value="">— Choose course —</option>
              {COURSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-navy font-black uppercase tracking-widest text-sm mb-2">
              Workout File
            </label>
            <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-navy border-opacity-30 rounded-lg cursor-pointer hover:border-gold transition-colors bg-cream-light">
              <div className="text-center">
                {file ? (
                  <span className="text-navy font-semibold">{file.name}</span>
                ) : (
                  <>
                    <p className="text-navy opacity-50">Drop .fit, .gpx, or workout screenshot</p>
                    <p className="text-gold text-sm mt-1 font-bold">click to browse · or paste screenshot</p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept=".fit,.gpx,.heic,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {error && (
            <p className="text-terracotta font-semibold border border-terracotta rounded-lg px-4 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name || !file}
            className="w-full bg-navy text-white font-black uppercase tracking-widest py-4 rounded-lg text-lg hover:bg-terracotta transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? file && /\.(heic|jpe?g|png|webp)$/i.test(file.name)
                ? 'Analyzing screenshot...'
                : 'Parsing...'
              : 'Upload Workout File'}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="border-2 border-gold rounded-lg p-6 bg-cream-light">
            <p className="text-gold font-black uppercase tracking-widest text-sm mb-4">Workout Saved!</p>
            <p className="text-navy text-xl font-bold mb-4">{result.name}</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Distance', value: formatDistance(result.distance_m) },
                { label: 'Duration', value: formatDuration(result.duration_s) },
                { label: 'Avg Speed', value: formatSpeed(result.avg_speed_ms) },
                { label: 'Heart Rate', value: formatHr(result.avg_hr) },
                { label: 'Calories', value: formatCalories(result.calories) },
              ].map(({ label, value }) => (
                <div key={label} className="border border-navy border-opacity-20 rounded p-3 bg-white">
                  <p className="text-navy text-xs uppercase tracking-wider opacity-50">{label}</p>
                  <p className="text-gold font-bold text-lg">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setResult(null); setFile(null); setName(''); setLocation(''); }}
              className="flex-1 border-2 border-navy text-navy font-black uppercase tracking-wider py-3 rounded-lg hover:bg-navy hover:text-white transition-colors"
            >
              Upload Another
            </button>
            <a
              href="/dashboard"
              className="flex-1 bg-navy text-white font-black uppercase tracking-wider py-3 rounded-lg text-center hover:bg-terracotta transition-colors"
            >
              View Dashboard
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
