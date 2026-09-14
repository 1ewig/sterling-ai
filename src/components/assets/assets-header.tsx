'use client';

import React, { memo } from 'react';
import { RefreshCw, ShieldCheck, Layers, ArrowLeftRight } from 'lucide-react';
import { tapScalePill } from '@/constants/animation';
import { motion } from 'framer-motion';

export interface AssetsHeaderProps {
  accountMode?: string;
  holdMode?: string;
  accountLevel?: string;
  lastUpdated: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const AssetsHeader = memo(function AssetsHeader({
  accountMode = 'unified',
  holdMode = 'one_way_mode',
  accountLevel,
  lastUpdated,
  isLoading,
  onRefresh,
}: AssetsHeaderProps) {
  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-spacing-lg border-b border-theme-border-subtle">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-extrabold tracking-tight text-theme-text-primary">
            Portfolio & Balances
          </h1>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-theme-brand-primary/10 text-theme-brand-primary border border-theme-brand-primary/20">
            <ShieldCheck className="size-3" />
            Bitget UTA v3
          </span>
        </div>
        <p className="text-xs text-theme-text-secondary mt-1 max-w-xl">
          Real-time Unified Trading Account balances, cross-margin collateral capacity, and spot asset holdings.
        </p>
      </div>

      <div className="flex items-center flex-wrap gap-2.5 shrink-0">
        {/* Account Mode Badges */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-theme-bg-elevated border border-theme-border-subtle text-2xs text-theme-text-secondary">
          <Layers className="size-3 text-theme-text-muted" />
          <span className="capitalize">{accountMode} Mode</span>
          {accountLevel && <span className="text-theme-text-muted">({accountLevel})</span>}
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-theme-bg-elevated border border-theme-border-subtle text-2xs text-theme-text-secondary">
          <ArrowLeftRight className="size-3 text-theme-text-muted" />
          <span>{holdMode === 'hedge_mode' ? 'Hedge Mode' : 'One-Way Mode'}</span>
        </div>

        {/* Last Refreshed & Refresh Button */}
        {formattedTime && (
          <span className="text-2xs text-theme-text-muted font-mono mr-1">
            Updated {formattedTime}
          </span>
        )}

        <motion.button
          type="button"
          whileTap={tapScalePill}
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-theme-bg-elevated hover:bg-theme-bg-elevated/80 active:bg-theme-bg-surface border border-theme-border-subtle text-xs font-semibold text-theme-text-primary cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          title="Refresh balances"
        >
          <RefreshCw
            className={`size-3.5 text-theme-text-secondary transition-transform ${
              isLoading ? 'animate-spin text-theme-brand-primary' : ''
            }`}
          />
          <span>Refresh</span>
        </motion.button>
      </div>
    </div>
  );
});
