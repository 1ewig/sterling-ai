'use client';

import React, { memo } from 'react';
import { RefreshCw, ShieldCheck, Clock } from 'lucide-react';
import { tapScalePill } from '@/constants/animation';
import { motion } from 'framer-motion';

export interface PortfolioHeaderProps {
  lastUpdated: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const PortfolioHeader = memo(function PortfolioHeader({
  lastUpdated,
  isLoading,
  onRefresh,
}: PortfolioHeaderProps) {
  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString()
    : null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-theme-border-subtle pb-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-black text-theme-text-primary tracking-tight">
            Portfolio & Balances Desk
          </h1>
          <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-theme-brand-primary/10 text-theme-brand-primary border border-theme-brand-primary/20 flex items-center gap-1">
            <ShieldCheck className="size-3" />
            UTA v3 Live
          </span>
        </div>
        <p className="text-xs text-theme-text-secondary">
          Real-time Unified Trading Account balances, cross-margin collateral capacity, and spot asset holdings.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {formattedTime && (
          <div className="flex items-center gap-1.5 text-2xs text-theme-text-muted font-mono">
            <Clock className="size-3" />
            <span>Synced: {formattedTime}</span>
          </div>
        )}

        <motion.button
          type="button"
          whileTap={tapScalePill}
          onClick={onRefresh}
          disabled={isLoading}
          className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer select-none ${
            isLoading
              ? 'bg-theme-bg-elevated border-theme-border-subtle text-theme-text-muted cursor-not-allowed'
              : 'bg-theme-bg-surface hover:bg-theme-bg-elevated border-theme-border-subtle hover:border-theme-border-strong text-theme-text-primary shadow-2xs'
          }`}
          title="Refresh balances"
          aria-label="Refresh balances"
        >
          <RefreshCw
            className={`size-3.5 ${isLoading ? 'animate-spin text-theme-brand-primary' : 'text-theme-text-secondary'}`}
          />
          <span>Refresh</span>
        </motion.button>
      </div>
    </div>
  );
});
