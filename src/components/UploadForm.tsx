'use client';

import { useState, useEffect } from 'react';
import { TEAMMATES } from '@/lib/teammates';
import { COURSES } from '@/lib/courses';
import { formatDistance, formatDuration, formatSpeed, formatCalories } from '@/lib/formatters';

interface WorkoutResult {
  name: string;
  workout_date: string;
  distance_m: number | null;
  duration_s: number | null;
  avg_speed_ms: number | null;
  calories: number | null;
}

export default function UploadForm() {
  const [mode, setMode] = useState<'phone' | 'computer' | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [overviewFile, setOverviewFile] = useState<File | null>(null);
  const [lapsFiles, setLapsFiles] = useState<File[]>([]);
  const [fitFile, setFitFile] = useState<File | null>(null);
  const [garminUrl, setGarminUrl] = useState('');
  const [workoutDate, setWorkoutDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkoutResult | null>(null);
  const [error, setError] = useState('');

  function imageFileFromBlob(blob: Blob, mimeType: string, name: string): File {
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    return new File([blob], `${name}.${ext}`, { type: mimeType });
  }

  async function pasteFromClipboard(target: 'garminUrl' | 'laps') {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (target === 'garminUrl' && item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          const text = await blob.text();
          if (text.includes('connect.garmin.com')) {
            setGarminUrl(text.trim());
            return;
          }
          setError('No Garmin Connect link found in clipboard');
          return;
        }
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType && target === 'laps') {
          const blob = await item.getType(imageType);
          setLapsFiles((prev) => prev.length < 4 ? [...prev, imageFileFromBlob(blob, imageType, `laps-${prev.length + 1}`)] : prev);
          return;
        }
      }
      setError(target === 'laps' ? 'No image found in clipboard' : 'No Garmin Connect link found in clipboard');
    } catch {
      setError('Clipboard access denied — allow paste permission when prompted');
    }
  }

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type === 'text/plain') {
          // handled by paste buttons
          break;
        }
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            const ext = item.type === 'image/png' ? 'png' : 'jpg';
            setLapsFiles((prev) => prev.length < 4 ? [...prev, new File([blob], `laps-${prev.length + 1}.${ext}`, { type: item.type })] : prev);
          }
          break;
        }
      }
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const hasMainInput = !!(garminUrl || fitFile);
  const phoneReady = !!(garminUrl && workoutDate);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !hasMainInput) return;
    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('location', location);
    if (garminUrl) {
      formData.append('garminUrl', garminUrl);
      if (workoutDate) formData.append('workoutDate', new Date(workoutDate).toISOString());
      lapsFiles.forEach((f) => formData.append('lapsFile', f));
    } else if (fitFile) {
      formData.append('file', fitFile);
    }

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
        <>
          {/* Mode selector */}
          {!mode ? (
            <div className="space-y-4">
              <button
                onClick={() => setMode('phone')}
                className="w-full bg-white border-2 border-navy text-navy rounded-xl px-6 py-6 text-left hover:border-gold hover:shadow-md transition-all group"
              >
                <p className="font-black uppercase tracking-widest text-sm text-navy">Upload Paddle Data from Your Phone</p>
              </button>
              <button
                onClick={() => setMode('computer')}
                className="w-full bg-white border-2 border-navy text-navy rounded-xl px-6 py-6 text-left hover:border-gold hover:shadow-md transition-all group"
              >
                <p className="font-black uppercase tracking-widest text-sm text-navy">Upload Paddle Data from a Computer</p>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Back button */}
              <button
                type="button"
                onClick={() => { setMode(null); setOverviewFile(null); setLapsFiles([]); setFitFile(null); setGarminUrl(''); setWorkoutDate(''); setError(''); }}
                className="text-navy opacity-50 text-sm font-bold uppercase tracking-widest hover:opacity-100 transition-opacity"
              >
                ← Back
              </button>

              {/* Name */}
              <div>
                <select
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-white border-2 border-navy text-navy rounded-lg px-4 py-3 font-semibold focus:outline-none focus:border-gold appearance-none"
                >
                  <option value="">Select Your Name</option>
                  {TEAMMATES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {mode === 'phone' && (
                <>
                  {/* Location */}
                  <div>
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-white border-2 border-navy text-navy rounded-lg px-4 py-3 font-semibold focus:outline-none focus:border-gold appearance-none"
                    >
                      <option value="">Select Location</option>
                      {COURSES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Garmin Connect URL */}
                  <div>
                    <input
                      type="url"
                      value={garminUrl}
                      onChange={(e) => setGarminUrl(e.target.value)}
                      placeholder="Paste Garmin weblink URL here"
                      className="w-full bg-white border-2 border-navy text-navy rounded-lg px-4 py-3 font-semibold focus:outline-none focus:border-gold placeholder-navy placeholder-opacity-30"
                    />
                  </div>

                  {/* Laps Screenshots */}
                  <div className="space-y-2">
                    {lapsFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between border-2 border-navy border-opacity-20 rounded-lg px-4 py-3 bg-white">
                        <span className="text-navy font-semibold text-sm">Laps {i + 1}: {f.name}</span>
                        <button type="button" onClick={() => setLapsFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="text-navy opacity-40 hover:opacity-100 font-bold text-sm ml-4">✕</button>
                      </div>
                    ))}
                    {lapsFiles.length < 4 && (
                      <button type="button" onClick={() => pasteFromClipboard('laps')}
                        className="w-full border-2 border-dashed border-navy border-opacity-30 text-navy font-black uppercase tracking-widest py-4 rounded-lg hover:border-gold hover:text-gold transition-colors text-sm">
                        {lapsFiles.length === 0
                          ? 'Paste Screenshot of Laps Tab if you want split data (optional)'
                          : `Paste Laps Screenshot ${lapsFiles.length + 1} of 4`}
                      </button>
                    )}
                  </div>

                  {/* Date */}
                  <div>
                    <input type="date" value={workoutDate} onChange={(e) => setWorkoutDate(e.target.value)} required
                      placeholder="Workout Date"
                      className="w-full bg-white border-2 border-navy text-navy rounded-lg px-4 py-3 font-semibold focus:outline-none focus:border-gold" />
                  </div>
                </>
              )}

              {mode === 'computer' && (
                <>
                  {/* .fit / .gpx */}
                  <div>
                    <label className="block text-navy font-black uppercase tracking-widest text-sm mb-2">
                      Upload .fit or .gpx File
                    </label>
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-navy border-opacity-30 rounded-lg cursor-pointer hover:border-gold transition-colors bg-cream-light">
                      <div className="text-center px-4">
                        {fitFile
                          ? <span className="text-navy font-semibold text-sm">{fitFile.name}</span>
                          : <p className="text-navy font-bold uppercase tracking-widest text-sm">Drag .fit or .gpx File</p>}
                      </div>
                      <input type="file" accept=".fit,.gpx" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0] ?? null; setFitFile(f); }} />
                    </label>
                  </div>
                </>
              )}

              {error && (
                <p className="text-terracotta font-semibold border border-terracotta rounded-lg px-4 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !name || (mode === 'phone' ? !phoneReady : !hasMainInput)}
                className="w-full bg-navy text-white font-black uppercase tracking-widest py-4 rounded-lg text-lg hover:bg-terracotta transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading
                  ? overviewFile ? 'Analyzing screenshot...' : 'Parsing...'
                  : 'Upload Data'}
              </button>
            </form>
          )}
        </>
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
              onClick={() => { setResult(null); setOverviewFile(null); setLapsFiles([]); setFitFile(null); setGarminUrl(''); setWorkoutDate(''); setName(''); setLocation(''); }}
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
