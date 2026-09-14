'use client';

import React, { memo } from 'react';
import { DollarSign, Wallet, TrendingUp, TrendingDown, Activity } from 'lucide-react';

export interface PortfolioMetricCardsProps {
  totalEquity: number;
  availableEquity: number;
  unrealizedPnl: number;
  marginRatioPercent: number;
  positionValue?: number;
}

export const PortfolioMetricCards = memo(function PortfolioMetricCards({
  totalEquity,
  availableEquity,
  unrealizedPnl,
  marginRatioPercent,
  positionValue = 0,
}: PortfolioMetricCardsProps) {
  const isPnlPositive = unrealizedPnl >= 0;
  const formattedPnl = (isPnlPositive ? '+' : '') + unrealizedPnl.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total Account Equity */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-theme-bg-surface border border-theme-border-subtle flex flex-col gap-1.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-semibold text-theme-text-muted tracking-wider uppercase">
            Total Collateral Equity
          </span>
          <DollarSign className="size-4 text-theme-brand-primary" />
        </div>
        <div className="text-lg sm:text-xl font-mono font-bold text-theme-text-primary truncate">
          ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <span className="text-2xs text-theme-text-muted">
          Total USD collateral valuation
        </span>
      </div>

      {/* 2. Available Margin / Collateral */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-theme-bg-surface border border-theme-border-subtle flex flex-col gap-1.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-semibold text-theme-text-muted tracking-wider uppercase">
            Available Collateral
          </span>
          <Wallet className="size-4 text-theme-status-info" />
        </div>
        <div className="text-lg sm:text-xl font-mono font-bold text-theme-text-primary truncate">
          ${availableEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <span className="text-2xs text-theme-text-muted">
          Usable margin for new orders
        </span>
      </div>

      {/* 3. Unrealized PnL */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-theme-bg-surface border border-theme-border-subtle flex flex-col gap-1.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-semibold text-theme-text-muted tracking-wider uppercase">
            Net Unrealized PnL
          </span>
          {isPnlPositive ? (
            <TrendingUp className="size-4 text-theme-status-success" />
          ) : (
            <TrendingDown className="size-4 text-theme-status-danger" />
          )}
        </div>
        <div
          className={`text-lg sm:text-xl font-mono font-bold truncate ${
            isPnlPositive ? 'text-theme-status-success' : 'text-theme-status-danger'
          }`}
        >
          ${formattedPnl}
        </div>
        <span className="text-2xs text-theme-text-muted">
          Floating derivatives profit/loss
        </span>
      </div>

      {/* 4. Maintenance Margin Ratio (MMR) */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-theme-bg-surface border border-theme-border-subtle flex flex-col gap-1.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-semibold text-theme-text-muted tracking-wider uppercase">
            Margin Ratio (MMR)
          </span>
          <Activity className="size-4 text-theme-brand-primary" />
        </div>
        <div className="text-lg sm:text-xl font-mono font-bold text-theme-text-primary truncate">
          {marginRatioPercent.toFixed(2)}%
        </div>
        <span className="text-2xs text-theme-text-muted">
          Positions: ${positionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
});
