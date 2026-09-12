'use client';

import React, { memo } from 'react';
import type { BitgetWsBookData } from '@/lib/bitget/types';

interface OrderbookDepthMiniProps {
  orderbook: BitgetWsBookData | null;
}

const FIXED_ROW_COUNT = 5;

export const OrderbookDepthMini = memo(function OrderbookDepthMini({
  orderbook,
}: OrderbookDepthMiniProps) {
  const rawAsks = orderbook?.asks || [];
  const rawBids = orderbook?.bids || [];

  // Take top 5 asks and reverse so lowest ask (best ask) is at bottom near spread
  const topAsks = [...rawAsks].slice(0, FIXED_ROW_COUNT).reverse();
  const topBids = [...rawBids].slice(0, FIXED_ROW_COUNT);

  // Pad to guaranteed 5 slots
  const paddedAsks: Array<[string, string] | null> = Array.from({ length: FIXED_ROW_COUNT }, (_, i) => {
    const offset = FIXED_ROW_COUNT - topAsks.length;
    return i >= offset ? topAsks[i - offset] : null;
  });

  const paddedBids: Array<[string, string] | null> = Array.from({ length: FIXED_ROW_COUNT }, (_, i) => {
    return i < topBids.length ? topBids[i] : null;
  });

  // Calculate max size to scale depth bars
  const allSizes = [...topAsks, ...topBids].map((item) => parseFloat(item[1]) || 0);
  const maxSize = Math.max(...allSizes, 1);

  const bestAsk = topAsks.length > 0 ? parseFloat(topAsks[topAsks.length - 1][0]) : 0;
  const bestBid = topBids.length > 0 ? parseFloat(topBids[0][0]) : 0;
  const spread = bestAsk > 0 && bestBid > 0 ? (bestAsk - bestBid).toFixed(2) : '—';

  return (
    <div className="p-3.5 flex flex-col gap-2 select-none">
      <div className="flex items-center justify-between text-2xs font-bold text-theme-text-secondary uppercase tracking-wider">
        <span>Order Book Depth (L2)</span>
        <span className="text-theme-text-muted font-mono">Top 5</span>
      </div>

      <div className="flex items-center justify-between text-3xs font-mono text-theme-text-muted px-1">
        <span>Price (USDT)</span>
        <span>Size</span>
      </div>

      {/* Asks (Sells - Red) - Guaranteed exactly 5 rows */}
      <div className="flex flex-col gap-0.5">
        {paddedAsks.map((row, i) => {
          if (!row) {
            return (
              <div
                key={`ask-empty-${i}`}
                className="h-[24px] flex items-center justify-between py-0.5 px-1 rounded text-2xs font-mono text-theme-text-muted/30"
              >
                <span>—</span>
                <span>—</span>
              </div>
            );
          }

          const [priceStr, sizeStr] = row;
          const price = parseFloat(priceStr);
          const size = parseFloat(sizeStr);
          const depthPercent = Math.min((size / maxSize) * 100, 100);

          return (
            <div
              key={`ask-${i}-${priceStr}`}
              className="relative h-[24px] flex items-center justify-between py-0.5 px-1 rounded text-2xs font-mono overflow-hidden"
            >
              <div
                className="absolute inset-y-0 right-0 bg-theme-status-danger/15 pointer-events-none transition-all duration-150"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="relative z-10 text-theme-status-danger font-medium font-mono">
                {price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="relative z-10 text-theme-text-secondary font-mono">
                {size.toFixed(4)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Spread Divider - Fixed height */}
      <div className="h-[24px] px-2 rounded bg-theme-bg-surface/80 border border-theme-border-subtle/50 flex items-center justify-between text-3xs font-mono text-theme-text-muted">
        <span>Spread</span>
        <span className="font-bold text-theme-text-primary">${spread}</span>
      </div>

      {/* Bids (Buys - Green) - Guaranteed exactly 5 rows */}
      <div className="flex flex-col gap-0.5">
        {paddedBids.map((row, i) => {
          if (!row) {
            return (
              <div
                key={`bid-empty-${i}`}
                className="h-[24px] flex items-center justify-between py-0.5 px-1 rounded text-2xs font-mono text-theme-text-muted/30"
              >
                <span>—</span>
                <span>—</span>
              </div>
            );
          }

          const [priceStr, sizeStr] = row;
          const price = parseFloat(priceStr);
          const size = parseFloat(sizeStr);
          const depthPercent = Math.min((size / maxSize) * 100, 100);

          return (
            <div
              key={`bid-${i}-${priceStr}`}
              className="relative h-[24px] flex items-center justify-between py-0.5 px-1 rounded text-2xs font-mono overflow-hidden"
            >
              <div
                className="absolute inset-y-0 right-0 bg-theme-status-success/15 pointer-events-none transition-all duration-150"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="relative z-10 text-theme-status-success font-medium font-mono">
                {price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="relative z-10 text-theme-text-secondary font-mono">
                {size.toFixed(4)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
