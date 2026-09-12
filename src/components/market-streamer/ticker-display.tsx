'use client';

import React, { memo } from 'react';
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
      <div className="px-3.5 py-6 flex items-center justify-center text-theme-text-muted border-b border-theme-border-subtle">
        <span className="text-2xs font-mono">Connecting to {symbol}...</span>
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
      : `$${(quoteVol / 1_000).toFixed(1)}K`;

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
    <div className="px-3.5 py-3 border-b border-theme-border-subtle flex flex-col gap-3 select-none">
      {/* Price & 24h Delta Line */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2.5">
          <span
            className={`text-xl font-bold font-mono tracking-tight transition-colors duration-200 ${
              tickDirection === 'up'
                ? 'text-theme-status-success'
                : tickDirection === 'down'
                ? 'text-theme-status-danger'
                : 'text-theme-text-primary'
            }`}
          >
            ${formattedPrice}
          </span>
          <span
            className={`text-xs font-mono font-medium ${
              isPositive ? 'text-theme-status-success' : 'text-theme-status-danger'
            }`}
          >
            {isPositive ? '+' : ''}{(changeRatio * 100).toFixed(2)}%
          </span>
        </div>

        {ticker.fundingRate && (
          <div className="flex items-center gap-1 text-3xs font-mono text-theme-text-muted">
            <span>Funding:</span>
            <span
              className={`font-medium ${
                parseFloat(ticker.fundingRate) >= 0
                  ? 'text-theme-status-success'
                  : 'text-theme-status-danger'
              }`}
            >
              {(parseFloat(ticker.fundingRate) * 100).toFixed(4)}%
            </span>
          </div>
        )}
      </div>

      {/* 24h Range Bar */}
      <div className="flex flex-col gap-1">
        <div className="relative h-1 w-full bg-theme-bg-surface rounded-full overflow-hidden">
          <div
            className="absolute top-0 bottom-0 left-0 bg-theme-text-secondary/60 rounded-full transition-all duration-300"
            style={{ width: `${rangePercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-3xs font-mono text-theme-text-muted">
          <span>L: ${low24h.toLocaleString()}</span>
          <span>Vol: {formattedVol}</span>
          <span>H: ${high24h.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
});
