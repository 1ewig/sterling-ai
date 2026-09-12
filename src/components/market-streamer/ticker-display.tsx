'use client';

import React, { memo } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { BitgetWsTickerData } from '@/lib/bitget/types';
import type { TickDirection } from '@/hooks/market';

interface TickerDisplayProps {
  ticker: BitgetWsTickerData | null;
  tickDirection: TickDirection;
  symbol: string;
}

export const TickerDisplay = memo(function TickerDisplay({
  ticker,
  tickDirection,
  symbol,
}: TickerDisplayProps) {
  if (!ticker) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[140px] text-theme-text-muted border-b border-theme-border-subtle">
        <div className="size-5 border-2 border-theme-border-subtle border-t-theme-brand-primary rounded-full animate-spin mb-2" />
        <span className="text-xs font-mono">Subscribing to {symbol}...</span>
      </div>
    );
  }

  const price = parseFloat(ticker.lastPr);
  const changeRatio = parseFloat(ticker.change24h || '0');
  const isPositive = changeRatio >= 0;
  const high24h = parseFloat(ticker.high24h || '0');
  const low24h = parseFloat(ticker.low24h || '0');

  // Format volume
  const quoteVol = parseFloat(ticker.quoteVolume || '0');
  const formattedVol =
    quoteVol > 1_000_000_000
      ? `$${(quoteVol / 1_000_000_000).toFixed(2)}B`
      : quoteVol > 1_000_000
      ? `$${(quoteVol / 1_000_000).toFixed(2)}M`
      : `$${(quoteVol / 1_000).toFixed(2)}K`;

  // Calculate 24h range percentage
  const rangeSpan = high24h - low24h;
  const rangePercent = rangeSpan > 0 ? Math.min(Math.max(((price - low24h) / rangeSpan) * 100, 0), 100) : 50;

  // Format price decimals dynamically
  const formattedPrice =
    price >= 1000
      ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : price >= 1
      ? price.toFixed(4)
      : price.toFixed(6);

  return (
    <div className="p-4 border-b border-theme-border-subtle flex flex-col gap-3.5 bg-theme-bg-base/40 select-none">
      {/* Primary Price & Change */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-2xs font-semibold text-theme-text-muted uppercase tracking-wider">
            Last Price
          </span>
          <div
            className={`flex items-baseline gap-1.5 transition-colors duration-300 rounded px-1 -mx-1 ${
              tickDirection === 'up'
                ? 'bg-theme-status-success/20 text-theme-status-success'
                : tickDirection === 'down'
                ? 'bg-theme-status-danger/20 text-theme-status-danger'
                : 'text-theme-text-primary'
            }`}
          >
            <span className="text-2xl font-extrabold font-mono tracking-tight">
              ${formattedPrice}
            </span>
          </div>
        </div>

        {/* 24h Change Badge */}
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-bold border ${
            isPositive
              ? 'bg-theme-status-success/10 text-theme-status-success border-theme-status-success/30'
              : 'bg-theme-status-danger/10 text-theme-status-danger border-theme-status-danger/30'
          }`}
        >
          {isPositive ? (
            <ArrowUpRight className="size-3.5 stroke-[2.5]" />
          ) : (
            <ArrowDownRight className="size-3.5 stroke-[2.5]" />
          )}
          <span>{isPositive ? '+' : ''}{(changeRatio * 100).toFixed(2)}%</span>
        </div>
      </div>

      {/* 24h High - Low Range Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-2xs font-mono text-theme-text-muted">
          <span>Low: ${low24h.toLocaleString()}</span>
          <span>24h Range</span>
          <span>High: ${high24h.toLocaleString()}</span>
        </div>
        <div className="relative h-1.5 w-full bg-theme-bg-surface rounded-full overflow-hidden border border-theme-border-subtle/60">
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-theme-status-danger via-amber-400 to-theme-status-success rounded-full"
            style={{ width: `${rangePercent}%` }}
          />
        </div>
      </div>

      {/* Key Market Stats Grid */}
      <div className="grid grid-cols-2 gap-2 text-2xs font-mono pt-1">
        <div className="p-2 rounded-lg bg-theme-bg-surface/70 border border-theme-border-subtle flex flex-col">
          <span className="text-theme-text-muted text-3xs uppercase font-sans">24h Turnover</span>
          <span className="font-bold text-theme-text-primary mt-0.5">{formattedVol}</span>
        </div>

        {ticker.fundingRate ? (
          <div className="p-2 rounded-lg bg-theme-bg-surface/70 border border-theme-border-subtle flex flex-col">
            <span className="text-theme-text-muted text-3xs uppercase font-sans">Funding Rate</span>
            <span
              className={`font-bold mt-0.5 ${
                parseFloat(ticker.fundingRate) >= 0
                  ? 'text-theme-status-success'
                  : 'text-theme-status-danger'
              }`}
            >
              {(parseFloat(ticker.fundingRate) * 100).toFixed(4)}%
            </span>
          </div>
        ) : (
          <div className="p-2 rounded-lg bg-theme-bg-surface/70 border border-theme-border-subtle flex flex-col">
            <span className="text-theme-text-muted text-3xs uppercase font-sans">Spread (Bid/Ask)</span>
            <span className="font-bold text-theme-text-primary mt-0.5">
              {ticker.bidPr && ticker.askPr
                ? `$${(parseFloat(ticker.askPr) - parseFloat(ticker.bidPr)).toFixed(2)}`
                : 'Tight'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
