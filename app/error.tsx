'use client';

import React, { useEffect } from 'react';
import { Gem, RefreshCw } from 'lucide-react';
import { resetToSampleData } from '@/lib/storage';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Captured by Next.js App Error Boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] text-zinc-900 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
          <Gem className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900">Dahod Jewellery Lending Ledger</h2>
        <p className="text-xs text-zinc-500">
          A temporary issue occurred while rendering the page. You can try refreshing or resetting to default data.
        </p>
        <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-mono text-zinc-600 break-all text-left">
          {error?.message || 'Render error'}
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <button
            onClick={() => {
              resetToSampleData();
              window.location.reload();
            }}
            className="px-4 py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs transition-all"
          >
            <span>Reset Data & Reload</span>
          </button>
        </div>
      </div>
    </div>
  );
}
