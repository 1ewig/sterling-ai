'use client';

import React, { memo, useCallback } from 'react';
import Link from 'next/link';
import { KeyRound, ShieldAlert, ArrowRight, Bot, FlaskConical, Plus } from 'lucide-react';
import { useTradingModeStore } from '@/stores/trading-mode-store';

export interface PortfolioUnconfiguredProps {
  errorMessage?: string;
}

export const PortfolioUnconfigured = memo(function PortfolioUnconfigured({
  errorMessage,
}: PortfolioUnconfiguredProps) {
  const openKeysModal = useTradingModeStore((s) => s.openKeysModal);
  const setTradingMode = useTradingModeStore((s) => s.setTradingMode);

  const handleSwitchToSandbox = useCallback(() => {
    setTradingMode('sandbox');
  }, [setTradingMode]);

  return (
    <div className="rounded-2xl bg-theme-bg-surface border border-theme-border-subtle p-spacing-lg sm:p-spacing-xl flex flex-col items-center justify-center text-center max-w-2xl mx-auto shadow-sm my-auto">
      <div className="size-14 rounded-2xl bg-theme-bg-elevated border border-theme-border-subtle flex items-center justify-center text-theme-brand-primary mb-4 shadow-2xs">
        <KeyRound className="size-7 stroke-[1.75]" />
      </div>

      <h2 className="text-lg sm:text-xl font-extrabold text-theme-text-primary tracking-tight">
        Bitget UTA v3 Live Connection
      </h2>

      <p className="text-xs sm:text-sm text-theme-text-secondary mt-2 max-w-md">
        Connect your Bitget API keys to sync your live portfolio, Unified margin balances, and active positions—or trade immediately with the built-in $100,000 Sandbox Paper Broker.
      </p>

      {errorMessage && (
        <div className="mt-4 p-3 rounded-xl bg-theme-status-warning/10 border border-theme-status-warning/20 text-theme-status-warning text-xs text-left w-full flex items-start gap-2.5">
          <ShieldAlert className="size-4 shrink-0 mt-0.5" />
          <span className="break-all">{errorMessage}</span>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full">
        <button
          type="button"
          onClick={openKeysModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-theme-brand-primary text-theme-bg-overlay font-bold text-xs hover:brightness-105 transition-all shadow-xs cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Connect Bitget API Keys</span>
        </button>

        <button
          type="button"
          onClick={handleSwitchToSandbox}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-theme-bg-elevated border border-theme-border-subtle text-theme-text-primary font-bold text-xs hover:bg-theme-bg-base transition-all shadow-2xs cursor-pointer"
        >
          <FlaskConical className="size-4 text-amber-400" />
          <span>Switch to $100K Sandbox</span>
        </button>

        <Link
          href="/chat"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-theme-bg-elevated border border-theme-border-subtle text-theme-text-secondary hover:text-theme-text-primary font-bold text-xs hover:bg-theme-bg-base transition-all shadow-2xs"
        >
          <Bot className="size-4" />
          <span>Desk Chat</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
});

export const AssetsUnconfigured = PortfolioUnconfigured;
export type AssetsUnconfiguredProps = PortfolioUnconfiguredProps;

