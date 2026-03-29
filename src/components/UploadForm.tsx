'use client';

import { useState, useEffect, useRef } from 'react';
import { TEAMMATES } from '@/lib/teammates';
import { COURSES } from '@/lib/courses';
import { formatDistance, formatDuration, formatSpeed } from '@/lib/formatters';

interface WorkoutResult {
  name: string;
  workout_date: string;
  distance_m: number | null;
  duration_s: number | null;
  avg_speed_ms: number | null;
}

export default function UploadForm() {
  const [mode, setMode] = useState<'phone' | 'computer' | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [overviewFile, setOverviewFile] = useState<File | null>(null);
  const [lapsFiles, setLapsFiles] = useState<File[]>([]);
  const [fitFile, setFitFile] = useState<File | null>(null);
  const [garminUrl, setGarminUrl] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date().toLocaleDateString('en-CA'));
  const garminUrlRef = useRef(garminUrl);
  const overviewFileRef = useRef(overviewFile);
  useEffect(() => { garminUrlRef.current = garminUrl; }, [garminUrl]);
  useEffect(() => { overviewFileRef.current = overviewFile; }, [overviewFile]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkoutResult | null>(null);
  const [error, setError] = useState('');

  function imageFileFromBlob(blob: Blob, mimeType: string, name: string): File {
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    return new File([blob], `${name}.${ext}`, { type: mimeType });
  }

  async function extractDateFromFile(file: File) {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/extract-date', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.date) setWorkoutDate(data.date);
    } catch {
      // silently ignore — user can set date manually
    }
  }

  async function pasteFromClipboard(target: 'garminUrl' | 'overview' | 'laps') {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (target === 'garminUrl' && item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          const text = await blob.text();
          const urlMatch = text.match(/https:\/\/connect\.garmin\.com\/(?:modern|app)\/activity\/\d+/);
          if (urlMatch) {
            setGarminUrl(urlMatch[0]);
            return;
          }
          setError('No Garmin Connect link found in clipboard');
          return;
        }
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType && target === 'overview') {
          const blob = await item.getType(imageType);
          const file = imageFileFromBlob(blob, imageType, 'overview');
          setOverviewFile(file);
          extractDateFromFile(file);
          return;
        }
        if (imageType && target === 'laps') {
          const blob = await item.getType(imageType);
          setLapsFiles((prev) => {
            if (prev.length >= 4) return prev;
            const file = imageFileFromBlob(blob, imageType, `laps-${prev.length + 1}`);
            if (prev.length === 0) extractDateFromFile(file);
            return [...prev, file];
          });
          return;
        }
      }
      setError(target === 'laps' ? 'No image found in clipboard' : target === 'overview' ? 'No image found in clipboard' : 'No Garmin Connect link found in clipboard');
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
            if (!garminUrlRef.current && !overviewFileRef.current) {
              const file = new File([blob], `overview.${ext}`, { type: item.type });
              setOverviewFile(file);
              extractDateFromFile(file);
            } else {
              setLapsFiles((prev) => {
                if (prev.length >= 4) return prev;
                const file = new File([blob], `laps-${prev.length + 1}.${ext}`, { type: item.type });
                if (prev.length === 0) extractDateFromFile(file);
                return [...prev, file];
              });
            }
          }
          break;
        }
      }
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const hasMainInput = !!(garminUrl || fitFile);
  const phoneReady = !!((garminUrl || overviewFile) && workoutDate);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || (mode === 'phone' ? !phoneReady : !hasMainInput)) return;
    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('location', location);
    if (garminUrl) {
      formData.append('garminUrl', garminUrl);
      if (workoutDate) formData.append('workoutDate', workoutDate);
      lapsFiles.forEach((f) => formData.append('lapsFile', f));
    } else if (overviewFile) {
      formData.append('file', overviewFile);
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
                onClick={() => setMode('computer')}
                className="w-full bg-white border-2 border-navy text-navy rounded-xl px-6 py-6 text-left hover:border-gold hover:shadow-md transition-all group"
              >
                <p className="font-black uppercase tracking-widest text-sm text-navy">Upload Using .GPX File</p>
              </button>
              <button
                onClick={() => setMode('phone')}
                className="w-full bg-white border-2 border-navy text-navy rounded-xl px-6 py-6 text-left hover:border-gold hover:shadow-md transition-all group"
              >
                <p className="font-black uppercase tracking-widest text-sm text-navy">Upload Using Screenshots &amp; Web Link</p>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Back button */}
              <button
                type="button"
                onClick={() => { setMode(null); setOverviewFile(null); setLapsFiles([]); setFitFile(null); setGarminUrl(''); setWorkoutDate(new Date().toLocaleDateString('en-CA')); setError(''); }}
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

                  {/* Garmin Connect URL or Overview Screenshot */}
                  {!overviewFile ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={garminUrl}
                        onPaste={(e) => {
                          e.preventDefault();
                          const uriList = e.clipboardData?.getData('text/uri-list') || '';
                          const text = e.clipboardData?.getData('text/plain') || '';
                          const garminRegex = /https:\/\/connect\.garmin\.com\/(?:modern|app)\/activity\/\d+/;
                          const match = uriList.match(garminRegex) || text.match(garminRegex);
                          if (match) {
                            setGarminUrl(match[0]);
                            setError('');
                          } else {
                            setGarminUrl(text);
                          }
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          const urlMatch = val.match(/https:\/\/connect\.garmin\.com\/(?:modern|app)\/activity\/\d+/);
                          setGarminUrl(urlMatch ? urlMatch[0] : val);
                        }}
                        placeholder="Paste Garmin weblink URL here"
                        className="w-full bg-white border-2 border-navy text-navy rounded-lg px-4 py-3 font-semibold focus:outline-none focus:border-gold placeholder-navy placeholder-opacity-30"
                      />
                      {!garminUrl && (
                        <>
                          <p className="text-center text-navy opacity-40 font-bold uppercase tracking-widest text-xs">or</p>
                          <button type="button" onClick={() => pasteFromClipboard('overview')}
                            className="w-full border-2 border-dashed border-navy border-opacity-30 text-navy font-black uppercase tracking-widest py-4 rounded-lg hover:border-gold hover:text-gold transition-colors text-sm">
                            Paste Screenshot of Activity Overview Tab
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between border-2 border-navy border-opacity-20 rounded-lg px-4 py-3 bg-white">
                      <span className="text-navy font-semibold text-sm">Overview screenshot added</span>
                      <button type="button" onClick={() => setOverviewFile(null)}
                        className="text-navy opacity-40 hover:opacity-100 font-bold text-sm ml-4">✕</button>
                    </div>
                  )}

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

                  {/* .fit / .gpx */}
                  <div>
                    <label className="block text-navy font-black uppercase tracking-widest text-sm mb-2">
                      Upload .fit or .gpx File
                    </label>
                    <label
                      className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-navy border-opacity-30 rounded-lg cursor-pointer hover:border-gold transition-colors bg-cream-light"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0] ?? null;
                        if (f) setFitFile(f);
                      }}
                    >
                      <div className="text-center px-4">
                        {fitFile
                          ? <span className="text-navy font-semibold text-sm">{fitFile.name}</span>
                          : <p className="text-navy font-bold uppercase tracking-widest text-sm">Drag .fit or .gpx File</p>}
                      </div>
                      <input type="file" accept=".fit,.gpx" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0] ?? null; setFitFile(f); }} />
                    </label>
                  </div>

                  {/* GPX instructions */}
                  <div className="bg-cream-light border-2 border-navy border-opacity-10 rounded-xl px-5 py-4 space-y-4 text-navy text-sm">
                    <div>
                      <p className="font-black uppercase tracking-widest text-xs mb-2 opacity-60">From your phone</p>
                      <ol className="space-y-1 opacity-70 list-decimal list-inside">
                        <li>Open <strong>Safari</strong> (not the Garmin app) and go to <strong>connect.garmin.com</strong></li>
                        <li>Log in and tap <strong>Activities</strong> to find the activity you want</li>
                        <li>Tap the activity to open it</li>
                        <li>Tap the <strong>gear icon</strong> (just above the distance data) → <strong>Export to GPX</strong></li>
                        <li>When prompted, tap <strong>Download</strong></li>
                        <li>Tap the <strong>blue arrow</strong> in the Safari address bar → tap <strong>Downloads</strong> → find and tap your activity file</li>
                        <li>Tap the <strong>Share icon</strong> (box with arrow) in the bottom left → <strong>Save to Files</strong></li>
                        <li>Come back to <strong>Artie</strong> and tap <strong>Choose File</strong> to upload it from your phone&apos;s files</li>
                      </ol>
                    </div>
                    <div>
                      <p className="font-black uppercase tracking-widest text-xs mb-2 opacity-60">From a laptop (way easier)</p>
                      <ol className="space-y-1 opacity-70 list-decimal list-inside">
                        <li>Go to <strong>connect.garmin.com</strong> and log in</li>
                        <li>Click <strong>Activities</strong> and select the activity you want</li>
                        <li>Click the <strong>gear icon</strong> → <strong>Export to GPX</strong></li>
                        <li>The file will download to your computer</li>
                        <li>Come back to <strong>Artie</strong> and click <strong>Choose File</strong> to upload it</li>
                      </ol>
                    </div>
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
                  ? (overviewFile && !garminUrl) ? 'Analyzing screenshot...' : 'Parsing...'
                  : 'Upload Data'}
              </button>
            </form>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center text-center space-y-6 py-4">
          <div className="w-16 h-16 rounded-full bg-gold flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <div>
            <p className="text-gold font-black uppercase tracking-widest text-xs mb-1">Workout Saved</p>
            <p className="text-navy font-black uppercase tracking-widest text-3xl">{result.name}</p>
          </div>

          <div className="w-full grid grid-cols-3 gap-3">
            {[
              { label: 'Distance', value: formatDistance(result.distance_m) },
              { label: 'Duration', value: formatDuration(result.duration_s) },
              { label: 'Avg Speed', value: formatSpeed(result.avg_speed_ms) },
            ].map(({ label, value }) => (
              <div key={label} className="border-2 border-navy border-opacity-20 rounded-lg p-3 bg-white">
                <p className="text-navy text-xs uppercase tracking-wider opacity-50 mb-1">{label}</p>
                <p className="text-gold font-black text-base leading-tight">{value}</p>
              </div>
            ))}
          </div>

          <div className="w-full flex flex-col gap-3 pt-2">
            <a
              href="/dashboard"
              className="w-full bg-navy text-white font-black uppercase tracking-wider py-3 rounded-lg text-center hover:bg-terracotta transition-colors"
            >
              Done
            </a>
            <button
              onClick={() => { setResult(null); setOverviewFile(null); setLapsFiles([]); setFitFile(null); setGarminUrl(''); setWorkoutDate(new Date().toLocaleDateString('en-CA')); setName(''); setLocation(''); }}
              className="w-full border-2 border-navy border-opacity-30 text-navy font-black uppercase tracking-wider py-3 rounded-lg hover:border-opacity-100 transition-colors"
            >
              Upload Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
