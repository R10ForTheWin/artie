'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TEAMMATES } from '@/lib/teammates';
import { COURSES } from '@/lib/courses';

interface Props {
  id: number;
  name: string;
  location: string | null;
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
      <div className="flex gap-3">
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

export default function WorkoutEditForm({ id, name, location, workout_date }: Props) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editLocation, setEditLocation] = useState(location || '');
  const [editDate, setEditDate] = useState(workout_date.split('T')[0]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/workouts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, location: editLocation, workout_date: editDate }),
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
    <div className="mt-4 space-y-3 border-2 border-navy border-opacity-20 rounded-lg p-4 bg-cream-light">
      <div>
        <label className="block text-navy text-xs font-black uppercase tracking-wider opacity-50 mb-1">Athlete</label>
        <select value={editName} onChange={(e) => setEditName(e.target.value)}
          className="w-full bg-white border-2 border-navy text-navy rounded-lg px-3 py-2 font-semibold text-sm focus:outline-none focus:border-gold appearance-none">
          {TEAMMATES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-navy text-xs font-black uppercase tracking-wider opacity-50 mb-1">Location</label>
        <select value={editLocation} onChange={(e) => setEditLocation(e.target.value)}
          className="w-full bg-white border-2 border-navy text-navy rounded-lg px-3 py-2 font-semibold text-sm focus:outline-none focus:border-gold appearance-none">
          <option value="">— None —</option>
          {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-navy text-xs font-black uppercase tracking-wider opacity-50 mb-1">Date</label>
        <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
          className="w-full bg-white border-2 border-navy text-navy rounded-lg px-3 py-2 font-semibold text-sm focus:outline-none focus:border-gold" />
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={handleSave} disabled={saving}
          className="bg-navy text-white font-black uppercase tracking-wider text-sm px-4 py-2 rounded-lg hover:bg-terracotta transition-colors disabled:opacity-40">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)}
          className="text-navy opacity-40 hover:opacity-100 font-bold text-sm uppercase tracking-wider">
          Cancel
        </button>
      </div>
      <div className="border-t border-navy border-opacity-10 pt-3 mt-1">
        <DeleteButton id={id} />
      </div>
    </div>
  );
}
