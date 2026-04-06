'use client';

import { useState, useEffect } from 'react';

interface HRWorkout {
  avg_hr: number;
  avg_speed_ms: number;
  duration_s: number;
}

interface Props {
  avg_speed_ms: number | null;
  duration_s: number | null;
  distance_m: number | null;
  avg_hr: number | null;
  location: string | null;
  workout_date: string;
  hrWorkouts: HRWorkout[];
  athleteProfile: { weight_lbs: number; age: number | null } | null;
}

interface UserProfile {
  weight_lbs: number;
  age: number;
}

const PROFILE_KEY = 'artie_user_profile';
const DEFAULT_SPEED_MPH = 4.0;

function getMET(speedMph: number): number {
  if (speedMph < 3.0) return 5.0;
  if (speedMph < 4.5) return 6.5;
  if (speedMph < 5.5) return 8.0;
  if (speedMph < 6.2) return 10.0;
  return 12.5;
}

function getAgeMultiplier(age: number): number {
  if (age < 30) return 1.05;
  if (age <= 45) return 1.00;
  if (age <= 60) return 0.95;
  return 0.90;
}

// Keytel et al. HR-based formula (gender-neutral blend)
function calcCaloriesFromHR(hr: number, weight_kg: number, age: number, duration_min: number): number {
  const calsPerMin = (-55.0969 + 0.6309 * hr + 0.1988 * weight_kg + 0.2017 * age) / 4.184;
  return Math.max(0, Math.round(calsPerMin * duration_min));
}

// Compute a personal calibration factor from workouts that have both HR and speed data.
// Returns the average ratio of (HR-based calories) / (MET-based calories) across those workouts.
// When applied to MET estimates on no-HR workouts, it corrects for individual physiology.
function computeCalibrationFactor(hrWorkouts: HRWorkout[], weight_kg: number, age: number): number {
  const ratios = hrWorkouts.map(w => {
    const speedMph = w.avg_speed_ms * 2.23694;
    const durationMin = w.duration_s / 60;
    const hrCalories = calcCaloriesFromHR(w.avg_hr, weight_kg, age, durationMin);
    const metCalories = getMET(speedMph) * weight_kg * (durationMin / 60) * getAgeMultiplier(age);
    return hrCalories / metCalories;
  }).filter(r => isFinite(r) && r > 0.3 && r < 3.0); // discard outliers
  if (ratios.length === 0) return 1.0;
  return ratios.reduce((a, b) => a + b, 0) / ratios.length;
}

async function fetchWindMph(location: string, date: string): Promise<number | null> {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    );
    const geoData = await geoRes.json();
    if (!geoData.results?.length) return null;
    const { latitude, longitude } = geoData.results[0];

    const dateStr = date.split('T')[0];
    const weatherRes = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${dateStr}&end_date=${dateStr}&daily=wind_speed_10m_max&wind_speed_unit=mph&timezone=auto`
    );
    const weatherData = await weatherRes.json();
    return weatherData.daily?.wind_speed_10m_max?.[0] ?? null;
  } catch {
    return null;
  }
}

function ProfileModal({
  title,
  weightValue,
  ageValue,
  onWeightChange,
  onAgeChange,
  onSave,
  onDismiss,
  dismissLabel,
}: {
  title: string;
  weightValue: string;
  ageValue: string;
  onWeightChange: (v: string) => void;
  onAgeChange: (v: string) => void;
  onSave: () => void;
  onDismiss: () => void;
  dismissLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
        <h2 className="text-navy font-black uppercase tracking-widest text-lg mb-1">{title}</h2>
        <p className="text-navy/50 text-sm mb-6">Used to calculate calories burned</p>
        <div className="space-y-4">
          <div>
            <label className="block text-navy text-xs uppercase tracking-wider font-bold mb-1">Body Weight (lbs)</label>
            <input
              type="number"
              value={weightValue}
              onChange={e => onWeightChange(e.target.value)}
              placeholder="e.g. 165"
              className="w-full border-2 border-navy/20 rounded-lg px-4 py-2 text-navy focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="block text-navy text-xs uppercase tracking-wider font-bold mb-1">Age</label>
            <input
              type="number"
              value={ageValue}
              onChange={e => onAgeChange(e.target.value)}
              placeholder="e.g. 38"
              className="w-full border-2 border-navy/20 rounded-lg px-4 py-2 text-navy focus:outline-none focus:border-gold"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onSave}
            className="flex-1 bg-gold text-white font-black uppercase tracking-wider py-2 rounded-lg hover:bg-yellow-500 transition-colors"
          >
            Save
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 border-2 border-navy/20 text-navy/50 font-bold uppercase tracking-wider py-2 rounded-lg hover:border-navy/40 transition-colors"
          >
            {dismissLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CalorieCard({ avg_speed_ms, duration_s, distance_m, avg_hr, location, workout_date, hrWorkouts, athleteProfile }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const [windMph, setWindMph] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (stored) {
      setProfile(JSON.parse(stored));
    } else {
      setShowModal(true);
    }
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    if (!profile || !location) return;
    fetchWindMph(location, workout_date).then(setWindMph);
  }, [profile, location, workout_date]);

  function saveProfile() {
    const w = parseFloat(weightInput);
    const a = parseInt(ageInput, 10);
    if (!w || !a || w < 50 || w > 500 || a < 10 || a > 110) return;
    const p: UserProfile = { weight_lbs: w, age: a };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    setProfile(p);
    setShowModal(false);
    setWeightInput('');
    setAgeInput('');
  }

  if (!profileLoaded && !athleteProfile) return null;

  // Athlete DB profile takes precedence over localStorage viewer profile
  const activeProfile = athleteProfile
    ? { weight_lbs: athleteProfile.weight_lbs, age: athleteProfile.age ?? 40 }
    : profile;

  // Derive speed and duration, tracking whether we fell back to estimates
  let speedMph: number;
  let durationMin: number;
  let speedEstimated = false;
  let durationEstimated = false;

  if (avg_speed_ms) {
    speedMph = avg_speed_ms * 2.23694;
  } else {
    speedMph = DEFAULT_SPEED_MPH;
    speedEstimated = true;
  }

  if (duration_s) {
    durationMin = duration_s / 60;
  } else if (distance_m) {
    durationMin = (distance_m * 0.000621371) / speedMph * 60;
    durationEstimated = true;
  } else {
    durationMin = 0;
  }

  if (!activeProfile) {
    return (
      <>
        {showModal && (
          <ProfileModal
            title="Your Profile"
            weightValue={weightInput}
            ageValue={ageInput}
            onWeightChange={setWeightInput}
            onAgeChange={setAgeInput}
            onSave={saveProfile}
            onDismiss={() => setShowModal(false)}
            dismissLabel="Skip"
          />
        )}
        {!showModal && (
          <button
            onClick={() => setShowModal(true)}
            className="text-navy/40 text-xs uppercase tracking-wider hover:text-navy/70 transition-colors"
          >
            + Set up calorie tracking
          </button>
        )}
      </>
    );
  }

  if (durationMin === 0) return null;

  const weight_kg = activeProfile.weight_lbs / 2.205;

  let windMultiplier = 1.0;
  let windLabel: string | null = null;
  if (windMph !== null) {
    if (windMph < 8) {
      windMultiplier = 0.92;
      windLabel = `${Math.round(windMph)} mph wind`;
    } else if (windMph <= 15) {
      windMultiplier = 1.12;
      windLabel = `${Math.round(windMph)} mph wind`;
    }
  }

  let calories: number;
  let method: string;
  let detailLine: string;
  const isEstimated = speedEstimated || durationEstimated;

  if (avg_hr) {
    // HR-based formula is more accurate — wind adjustment still applies
    calories = Math.round(calcCaloriesFromHR(avg_hr, weight_kg, activeProfile.age, durationMin) * windMultiplier);
    method = 'HR-based';
    detailLine = `${avg_hr} bpm avg · ${activeProfile.weight_lbs} lbs · age ${activeProfile.age}`;
  } else {
    const met = getMET(speedMph);
    const ageMultiplier = getAgeMultiplier(activeProfile.age);
    const calibrationFactor = computeCalibrationFactor(hrWorkouts, weight_kg, activeProfile.age);
    const calibrated = calibrationFactor !== 1.0;
    calories = Math.round(met * weight_kg * (durationMin / 60) * ageMultiplier * calibrationFactor * windMultiplier);
    method = `MET ${met}`;
    detailLine = `${speedMph.toFixed(1)} mph${speedEstimated ? ' (est.)' : ''} · ${method}${calibrated ? ` · calibrated (${hrWorkouts.length}w)` : ''} · ${activeProfile.weight_lbs} lbs`;
  }

  if (windLabel) detailLine += ` · ${windLabel}`;

  return (
    <div className="border-2 border-navy/20 rounded-lg p-4 bg-white">
      <p className="text-navy text-xs uppercase tracking-wider opacity-50 mb-1">
        Est. Calories{isEstimated ? ' · estimated' : ''}
      </p>
      <p className="text-gold font-bold text-xl">
        🔥 {calories.toLocaleString()} kcal{' '}
        <span className="text-sm font-normal text-navy/40">(±10%)</span>
      </p>
      <p className="text-navy/40 text-xs mt-1">{detailLine}</p>
      {!athleteProfile && (
        <button
          onClick={() => setShowModal(true)}
          className="text-navy/30 text-xs mt-2 hover:text-navy/60 transition-colors"
        >
          Edit profile
        </button>
      )}
      {showModal && !athleteProfile && (
        <ProfileModal
          title="Your Profile"
          weightValue={weightInput || String(activeProfile.weight_lbs)}
          ageValue={ageInput || String(activeProfile.age)}
          onWeightChange={setWeightInput}
          onAgeChange={setAgeInput}
          onSave={saveProfile}
          onDismiss={() => setShowModal(false)}
          dismissLabel="Cancel"
        />
      )}
    </div>
  );
}
