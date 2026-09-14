'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertOctagon, RotateCcw, Bot, RefreshCw } from 'lucide-react';

export interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RouteError({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    // Log unexpected route exceptions to console for debugging
    console.error('Sterling Route Error:', error);
  }, [error]);

  return (
    <div className="flex-1 min-h-0 w-full flex items-center justify-center p-4 sm:p-6 bg-theme-bg-base select-text">
      <div className="max-w-lg w-full rounded-2xl bg-theme-bg-surface border border-theme-border-subtle p-6 sm:p-8 flex flex-col items-center text-center shadow-lg">
        {/* Error Badge */}
        <div className="size-14 rounded-2xl bg-theme-status-danger/10 border border-theme-status-danger/20 flex items-center justify-center text-theme-status-danger mb-4 shadow-2xs">
          <AlertOctagon className="size-7 stroke-[1.75]" />
        </div>

        {/* Title & Description */}
        <h1 className="text-lg sm:text-xl font-extrabold text-theme-text-primary tracking-tight">
          Desk View Interrupted
        </h1>
        <p className="text-xs sm:text-sm text-theme-text-secondary mt-2">
          An unexpected error occurred while rendering this market view. You can reload this segment or return to the main trading desk.
        </p>

        {/* Diagnostic Error Box */}
        <div className="mt-5 w-full text-left bg-theme-bg-elevated border border-theme-border-subtle rounded-xl p-3.5 flex flex-col gap-1.5 overflow-hidden">
          <div className="flex items-center justify-between text-3xs font-mono text-theme-text-muted uppercase tracking-wider">
            <span>Error Diagnostic</span>
            {error.digest && <span>Digest: {error.digest.slice(0, 10)}</span>}
          </div>
          <p className="font-mono text-2xs text-theme-status-danger break-words font-medium">
            {error.message || 'Unknown runtime exception encountered.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-theme-brand-primary text-theme-bg-overlay font-bold text-xs hover:brightness-105 active:brightness-95 transition-all shadow-xs cursor-pointer select-none"
          >
            <RotateCcw className="size-3.5" />
            <span>Try Again</span>
          </button>

          <Link
            href="/chat"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-theme-bg-elevated hover:bg-theme-bg-surface border border-theme-border-subtle hover:border-theme-border-strong text-theme-text-primary font-semibold text-xs transition-colors cursor-pointer select-none"
          >
            <Bot className="size-3.5 text-theme-text-secondary" />
            <span>Return to Desk Chat</span>
          </Link>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-theme-text-muted hover:text-theme-text-primary text-2xs transition-colors cursor-pointer select-none"
          >
            <RefreshCw className="size-3" />
            <span>Reload Page</span>
          </button>
        </div>
      </div>
    </div>
  );
}
