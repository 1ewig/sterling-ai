'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { KeyRound, ShieldAlert, ArrowRight, Bot } from 'lucide-react';

export interface AssetsUnconfiguredProps {
  errorMessage?: string;
}

export const AssetsUnconfigured = memo(function AssetsUnconfigured({
  errorMessage,
}: AssetsUnconfiguredProps) {
  return (
    <div className="rounded-2xl bg-theme-bg-surface border border-theme-border-subtle p-spacing-lg sm:p-spacing-xl flex flex-col items-center justify-center text-center max-w-2xl mx-auto shadow-sm my-auto">
      <div className="size-14 rounded-2xl bg-theme-bg-elevated border border-theme-border-subtle flex items-center justify-center text-theme-brand-primary mb-4 shadow-2xs">
        <KeyRound className="size-7 stroke-[1.75]" />
      </div>

      <h2 className="text-lg sm:text-xl font-extrabold text-theme-text-primary tracking-tight">
        Bitget UTA v3 Connection Required
      </h2>

      <p className="text-xs sm:text-sm text-theme-text-secondary mt-2 max-w-md">
        To view your live portfolio balance, effective collateral margin, and active derivative positions, configure your Bitget API credentials.
      </p>

      {errorMessage && (
        <div className="mt-4 p-3 rounded-xl bg-theme-status-warning/10 border border-theme-status-warning/20 text-theme-status-warning text-xs text-left w-full flex items-start gap-2.5">
          <ShieldAlert className="size-4 shrink-0 mt-0.5" />
          <span className="break-all">{errorMessage}</span>
        </div>
      )}

      <div className="mt-6 w-full text-left bg-theme-bg-elevated border border-theme-border-subtle rounded-xl p-3.5 text-xs text-theme-text-secondary">
        <div className="text-2xs font-bold uppercase tracking-wider text-theme-text-primary mb-2">
          Setup Instructions in <code className="text-theme-brand-primary">.env.local</code>:
        </div>
        <pre className="font-mono text-2xs text-theme-text-muted overflow-x-auto p-2 rounded bg-theme-bg-base border border-theme-border-subtle">
{`BITGET_API_KEY=your_api_key
BITGET_API_SECRET=your_api_secret
BITGET_PASSPHRASE=your_api_passphrase
BITGET_DEMO_TRADING=false`}
        </pre>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-brand-primary text-theme-bg-overlay font-bold text-xs hover:brightness-105 transition-all shadow-xs"
        >
          <Bot className="size-4" />
          <span>Return to Desk Chat</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
});
