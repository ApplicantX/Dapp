'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] text-zinc-900 p-6 font-sans">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto text-xl">
            💎
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Dahod Jewellery Lending Ledger</h2>
          <p className="text-xs text-zinc-500">
            A temporary issue occurred while loading the application.
          </p>
          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-mono text-zinc-600 break-all text-left">
            {error?.message || 'Server render error'}
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => reset()}
              className="px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-all"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="px-4 py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs transition-all"
            >
              Reset Data & Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
