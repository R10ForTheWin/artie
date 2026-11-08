'use client';

import { useState } from 'react';
import { ACTIVITIES, ACTIVITY_LABELS, type Activity } from '@/lib/activity';
import { useRouter } from 'next/navigation';
import { TEAMMATES } from '@/lib/teammates';
import { COURSES } from '@/lib/courses';

interface Props {
  id: number;
  name: string;
  location: string | null;
  activity?: Activity;
  workout_date: string;
}

function DeleteButton({ id }: { id: number }) {
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
    router.push('/dashboard');
  }

  if (confirming) {
    return (
      <div className="flex gap-5">
        <button onClick={handleDelete} className="text-terracotta font-bold text-sm uppercase tracking-wider hover:opacity-70">Confirm Delete</button>
        <button onClick={() => setConfirming(false)} className="text-navy opacity-40 hover:opacity-100 font-bold text-sm uppercase tracking-wider">Cancel</button>
      </div>
    );
  }
  return (
    <button onClick={() => setConfirming(true)} className="text-terracotta opacity-60 hover:opacity-100 font-bold text-sm uppercase tracking-wider transition-opacity">
      Delete Workout
    </button>
  );
}

export default function WorkoutEditForm({ id, name, location, workout_date, activity }: Props) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editLocation, setEditLocation] = useState(location || '');
  const [editDate, setEditDate] = useState(workout_date.split('T')[0]);
  const [editActivity, setEditActivity] = useState<Activity>(activity ?? 'paddle');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/workouts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, location: editLocation, workout_date: editDate, activity: editActivity }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-navy opacity-40 hover:opacity-100 text-sm font-bold uppercase tracking-wider transition-opacity"
      >
        Edit
      </button>
    );
  }

  return (
    <div className="basis-full mt-4 border-2 border-navy/20 rounded-xl p-4 sm:p-5 bg-cream-light">
      <div className="flex items-center justify-between mb-4">
        <p className="text-navy font-black uppercase tracking-widest text-sm">Edit workout</p>
        <button onClick={() => setEditing(false)} aria-label="Close"
          className="text-navy opacity-40 hover:opacity-100 font-bold text-lg leading-none px-1">✕</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        <Field label="Athlete">
          <select value={editName} onChange={(e) => setEditName(e.target.value)} className={`${CONTROL} ${SELECT}`}>
            {TEAMMATES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Activity">
          <select value={editActivity} onChange={(e) => setEditActivity(e.target.value as Activity)} className={`${CONTROL} ${SELECT}`}>
            {ACTIVITIES.map((a) => <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>)}
          </select>
        </Field>
        <Field label="Location">
          <select value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className={`${CONTROL} ${SELECT}`}>
            <option value="">No location</option>
            {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Date">
          {/* iOS gives date inputs a wide intrinsic size; appearance-none + min-w-0 keeps it in the box */}
          <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
            className={`${CONTROL} appearance-none min-w-0 [&::-webkit-date-and-time-value]:text-left`} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <button onClick={handleSave} disabled={saving}
          className="h-11 bg-navy text-white font-black uppercase tracking-wider text-sm rounded-lg hover:bg-terracotta transition-colors disabled:opacity-40">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)}
          className="h-11 border-2 border-navy/30 text-navy font-black uppercase tracking-wider text-sm rounded-lg hover:border-navy transition-colors">
          Cancel
        </button>
      </div>

      <div className="border-t border-navy/10 mt-5 pt-4 flex justify-center">
        <DeleteButton id={id} />
      </div>
    </div>
  );
}

const CONTROL =
  'block w-full h-11 bg-white border-2 border-navy/40 text-navy rounded-lg px-3 font-semibold text-base focus:outline-none focus:border-gold';
// appearance-none drops the native arrow, so the Field draws one
const SELECT = 'appearance-none pr-9';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const isSelect = (children as React.ReactElement)?.type === 'select';
  return (
    <label className="block min-w-0">
      <span className="block text-navy text-[11px] font-black uppercase tracking-wider opacity-50 mb-1">{label}</span>
      <span className="relative block">
        {children}
        {isSelect && (
          <svg aria-hidden="true" width="12" height="8" viewBox="0 0 12 8"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-navy">
            <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
      </span>
    </label>
  );
}
