'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Layers, Clock } from 'lucide-react';
import { tapScalePill } from '@/constants/animation';
import type { OrdersWorkbenchSummary } from '@/hooks/trade/use-orders-workbench';

export interface OrdersHeaderProps {
  summary: OrdersWorkbenchSummary;
  lastUpdated: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function OrdersHeader({
  summary,
  lastUpdated,
  isLoading,
  onRefresh,
}: OrdersHeaderProps) {
  const isPnlPositive = summary.totalUnrealizedPnl >= 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Title & Refresh Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-theme-border-subtle pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-theme-text-primary tracking-tight">
              Positions & Orders Desk
            </h1>
            <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-theme-brand-primary/10 text-theme-brand-primary border border-theme-brand-primary/20">
              UTA v3 Live
            </span>
          </div>
          <p className="text-xs text-theme-text-secondary">
            Real-time derivative positions, mark-to-market PnL calculations, and resting order book flow.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-2xs text-theme-text-muted font-mono">
              <Clock className="size-3" />
              <span>Synced: {lastUpdated.toLocaleTimeString()}</span>
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
            title="Refresh positions and open orders"
            aria-label="Refresh positions and open orders"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin text-theme-brand-primary' : ''}`} />
            <span>Refresh</span>
          </motion.button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Exposure */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-theme-bg-surface border border-theme-border-subtle flex flex-col gap-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold text-theme-text-muted tracking-wider uppercase">
              Total Margin Exposure
            </span>
            <DollarSign className="size-4 text-theme-brand-primary" />
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-theme-text-primary truncate">
            ${summary.totalExposureUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-2xs text-theme-text-muted">
            {summary.activePositionsCount} active contract {summary.activePositionsCount === 1 ? 'position' : 'positions'}
          </span>
        </div>

        {/* Net Unrealized PnL */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-theme-bg-surface border border-theme-border-subtle flex flex-col gap-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold text-theme-text-muted tracking-wider uppercase">
              Net Unrealized PnL
            </span>
            {isPnlPositive ? (
              <TrendingUp className="size-4 text-theme-status-success" />
            ) : (
              <TrendingDown className="size-4 text-theme-status-error" />
            )}
          </div>
          <div
            className={`text-lg sm:text-xl font-mono font-bold truncate ${
              isPnlPositive ? 'text-theme-status-success' : 'text-theme-status-error'
            }`}
          >
            {isPnlPositive ? '+' : ''}
            ${summary.totalUnrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-2xs text-theme-text-muted">
            Live mark-to-market settlement
          </span>
        </div>

        {/* Position Bias (Longs vs Shorts) */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-theme-bg-surface border border-theme-border-subtle flex flex-col gap-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold text-theme-text-muted tracking-wider uppercase">
              Active Positions
            </span>
            <Layers className="size-4 text-theme-text-secondary" />
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-theme-text-primary flex items-center gap-2">
            <span>{summary.activePositionsCount}</span>
            <span className="text-2xs font-normal text-theme-text-muted">
              ({summary.longsCount} Long / {summary.shortsCount} Short)
            </span>
          </div>
          <span className="text-2xs text-theme-text-muted">
            USDT-Margined Perpetuals & Equities
          </span>
        </div>

        {/* Working Orders */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-theme-bg-surface border border-theme-border-subtle flex flex-col gap-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold text-theme-text-muted tracking-wider uppercase">
              Resting Orders
            </span>
            <Clock className="size-4 text-theme-text-secondary" />
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-theme-text-primary flex items-center gap-2">
            <span>{summary.workingOrdersCount}</span>
            <span className="text-2xs font-normal text-theme-text-muted">
              ({summary.limitOrdersCount} Limit / {summary.planOrdersCount} Trigger)
            </span>
          </div>
          <span className="text-2xs text-theme-text-muted">
            Unfilled resting & TP/SL plan orders
          </span>
        </div>
      </div>
    </div>
  );
}
