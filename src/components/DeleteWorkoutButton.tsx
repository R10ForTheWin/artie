'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteWorkoutButton({ id }: { id: number }) {
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          className="text-terracotta font-bold text-xs uppercase tracking-wider hover:opacity-70"
        >
          Delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-navy opacity-40 font-bold text-xs uppercase tracking-wider hover:opacity-100"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-navy opacity-20 hover:opacity-60 font-bold text-xs uppercase tracking-wider transition-opacity"
    >
      ✕
    </button>
  );
}
