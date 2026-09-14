'use client';

import React, { useEffect } from 'react';
import { AlertOctagon, RotateCcw, RefreshCw } from 'lucide-react';

export interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Root global error boundary for catching fatal exceptions in the root layout.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Sterling Global Fatal Error:', error);
  }, [error]);

  return (
    <html lang="en" className="dark font-sans h-full">
      <body className="h-full min-h-screen bg-theme-bg-base text-theme-text-primary flex items-center justify-center p-4 antialiased">
        <div className="max-w-md w-full rounded-2xl bg-theme-bg-surface border border-theme-border-subtle p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl">
          <div className="size-14 rounded-2xl bg-theme-status-danger/10 border border-theme-status-danger/20 flex items-center justify-center text-theme-status-danger mb-4">
            <AlertOctagon className="size-7 stroke-[1.75]" />
          </div>

          <h1 className="text-lg sm:text-xl font-black text-theme-text-primary tracking-tight">
            Sterling Desk Critical Error
          </h1>

          <p className="text-xs sm:text-sm text-theme-text-secondary mt-2">
            A critical failure occurred within the application core.
          </p>

          <div className="mt-4 w-full text-left bg-theme-bg-elevated border border-theme-border-subtle rounded-xl p-3">
            <p className="font-mono text-2xs text-theme-status-danger break-all">
              {error.message || 'Fatal system exception.'}
            </p>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-brand-primary text-theme-bg-overlay font-bold text-xs hover:brightness-105 transition-all cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>Recover Session</span>
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-theme-bg-elevated border border-theme-border-subtle text-theme-text-primary text-xs font-semibold hover:bg-theme-bg-surface transition-colors cursor-pointer"
            >
              <RefreshCw className="size-3" />
              <span>Reload Desk</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
