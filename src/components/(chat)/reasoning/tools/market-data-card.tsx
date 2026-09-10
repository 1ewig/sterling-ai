'use client';

import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Percent, Layers } from 'lucide-react';

interface MarketDataCardProps {
  resultObj: Record<string, unknown>;
}

export const MarketDataCard = React.memo(function MarketDataCard({ resultObj }: MarketDataCardProps) {
  const symbol = String(resultObj.symbol || 'ASSET');
  const price = typeof resultObj.price === 'number' ? resultObj.price : null;
  const change24h = String(resultObj.change24h || '0.00%');
  const isPositive = !change24h.startsWith('-');
  const high24h = typeof resultObj.high24h === 'number' ? resultObj.high24h : null;
  const low24h = typeof resultObj.low24h === 'number' ? resultObj.low24h : null;
  const volume24h = String(resultObj.volume24hUsdt || '');
  const fundingRate = resultObj.fundingRate ? String(resultObj.fundingRate) : null;
  const openInterest = resultObj.openInterest ? String(resultObj.openInterest) : null;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-theme-bg-surface border border-theme-border-subtle shadow-sm">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-theme-brand-primary/10 text-theme-brand-primary">
            <DollarSign className="size-3.5" />
          </div>
          <span className="font-semibold text-xs text-theme-text-primary tracking-wide">
            {symbol}
          </span>
          <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-theme-bg-elevated text-theme-text-muted">
            Bitget Live
          </span>
        </div>

        {/* Price & Change */}
        {price !== null && (
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs text-theme-text-primary">
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </span>
            <span
              className={`flex items-center gap-0.5 text-2xs font-mono font-semibold px-1.5 py-0.5 rounded ${
                isPositive
                  ? 'bg-theme-status-success/15 text-theme-status-success border border-theme-status-success/20'
                  : 'bg-theme-status-danger/15 text-theme-status-danger border border-theme-status-danger/20'
              }`}
            >
              {isPositive ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
              {change24h}
            </span>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-theme-border-subtle/40 text-2xs font-mono">
        {high24h !== null && low24h !== null && (
          <div>
            <span className="text-theme-text-muted block">24h Range</span>
            <span className="text-theme-text-secondary font-medium">
              ${low24h.toLocaleString()} - ${high24h.toLocaleString()}
            </span>
          </div>
        )}

        {volume24h && (
          <div>
            <span className="text-theme-text-muted block">24h Vol (USDT)</span>
            <span className="text-theme-text-secondary font-medium">${volume24h}</span>
          </div>
        )}

        {fundingRate && (
          <div>
            <span className="text-theme-text-muted flex items-center gap-1">
              <Percent className="size-2.5" /> Funding (8h)
            </span>
            <span className="text-theme-text-secondary font-medium">{fundingRate}</span>
          </div>
        )}

        {openInterest && (
          <div>
            <span className="text-theme-text-muted flex items-center gap-1">
              <Layers className="size-2.5" /> Open Interest
            </span>
            <span className="text-theme-text-secondary font-medium">{openInterest}</span>
          </div>
        )}
      </div>
    </div>
  );
});
