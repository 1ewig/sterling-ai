'use client';

import React, { memo } from 'react';
import { DollarSign, Wallet, TrendingUp, TrendingDown, Activity } from 'lucide-react';

export interface AssetsMetricCardsProps {
  totalEquity: number;
  availableEquity: number;
  unrealizedPnl: number;
  marginRatioPercent: number;
  positionValue?: number;
}

export const AssetsMetricCards = memo(function AssetsMetricCards({
  totalEquity,
  availableEquity,
  unrealizedPnl,
  marginRatioPercent,
  positionValue = 0,
}: AssetsMetricCardsProps) {
  const isPnlPositive = unrealizedPnl >= 0;
  const formattedPnl = (isPnlPositive ? '+' : '') + unrealizedPnl.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Total Account Equity */}
      <div className="rounded-2xl bg-theme-bg-surface border border-theme-border-subtle p-spacing-md flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-theme-text-secondary mb-2">
          <span className="text-2xs font-bold uppercase tracking-wider">Total Equity (USD)</span>
          <div className="size-7 rounded-lg bg-theme-bg-elevated border border-theme-border-subtle flex items-center justify-center text-theme-brand-primary">
            <DollarSign className="size-4" />
          </div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-theme-text-primary tracking-tight">
            ${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-2xs text-theme-text-muted mt-1">
            Total USD collateral valuation
          </div>
        </div>
      </div>

      {/* 2. Available Margin / Collateral */}
      <div className="rounded-2xl bg-theme-bg-surface border border-theme-border-subtle p-spacing-md flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-theme-text-secondary mb-2">
          <span className="text-2xs font-bold uppercase tracking-wider">Available Collateral</span>
          <div className="size-7 rounded-lg bg-theme-bg-elevated border border-theme-border-subtle flex items-center justify-center text-theme-status-info">
            <Wallet className="size-4" />
          </div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-theme-text-primary tracking-tight">
            ${availableEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-2xs text-theme-text-muted mt-1">
            Usable margin for new orders
          </div>
        </div>
      </div>

      {/* 3. Unrealized PnL */}
      <div className="rounded-2xl bg-theme-bg-surface border border-theme-border-subtle p-spacing-md flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-theme-text-secondary mb-2">
          <span className="text-2xs font-bold uppercase tracking-wider">Unrealized PnL</span>
          <div
            className={`size-7 rounded-lg border flex items-center justify-center ${
              isPnlPositive
                ? 'bg-theme-status-success/10 border-theme-status-success/20 text-theme-status-success'
                : 'bg-theme-status-danger/10 border-theme-status-danger/20 text-theme-status-danger'
            }`}
          >
            {isPnlPositive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
          </div>
        </div>
        <div>
          <div
            className={`text-xl sm:text-2xl font-extrabold font-mono tracking-tight ${
              isPnlPositive ? 'text-theme-status-success' : 'text-theme-status-danger'
            }`}
          >
            ${formattedPnl}
          </div>
          <div className="text-2xs text-theme-text-muted mt-1">
            Floating derivatives profit/loss
          </div>
        </div>
      </div>

      {/* 4. Maintenance Margin Ratio (MMR) */}
      <div className="rounded-2xl bg-theme-bg-surface border border-theme-border-subtle p-spacing-md flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-theme-text-secondary mb-2">
          <span className="text-2xs font-bold uppercase tracking-wider">Margin Ratio (MMR)</span>
          <div className="size-7 rounded-lg bg-theme-bg-elevated border border-theme-border-subtle flex items-center justify-center text-theme-brand-primary">
            <Activity className="size-4" />
          </div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-theme-text-primary tracking-tight">
            {marginRatioPercent.toFixed(2)}%
          </div>
          <div className="text-2xs text-theme-text-muted mt-1">
            Positions: ${positionValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
});
