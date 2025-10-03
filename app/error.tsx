// app/error.tsx
'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-center px-4">
      <h1 className="text-3xl font-bold text-red-700 mb-2">Something went wrong</h1>
      <p className="text-gray-700 mb-4">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
      >
        Try Again
      </button>
    </div>
  );
}