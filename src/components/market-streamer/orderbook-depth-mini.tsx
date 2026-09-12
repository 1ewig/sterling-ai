'use client';

import React, { memo, useMemo } from 'react';
import { Layers } from 'lucide-react';
import type { BitgetWsBookData } from '@/lib/bitget/types';
import { formatMarketPrice, formatBookSize, formatSpread } from '@/lib/bitget';

interface OrderbookDepthMiniProps {
  orderbook: BitgetWsBookData | null;
}

const ROW_COUNT = 8;

export const OrderbookDepthMini = memo(function OrderbookDepthMini({
  orderbook,
}: OrderbookDepthMiniProps) {
  const {
    paddedAsks,
    paddedBids,
    bidPercent,
    askPercent,
    maxCumulative,
    spreadValue,
    spreadPercent,
  } = useMemo(() => {
    if (!orderbook) {
      return {
        paddedAsks: Array(ROW_COUNT).fill(null),
        paddedBids: Array(ROW_COUNT).fill(null),
        bidPercent: 50,
        askPercent: 50,
        maxCumulative: 1,
        spreadValue: 0,
        spreadPercent: '0',
      };
    }

    const rawAsks = orderbook.asks || [];
    const rawBids = orderbook.bids || [];

    // Take top 8 asks and reverse so lowest ask (best ask) is at bottom near spread
    const topAsks = rawAsks.slice(0, ROW_COUNT).reverse();
    const topBids = rawBids.slice(0, ROW_COUNT);

    let runningAskTotal = 0;
    const askTotals: number[] = [];
    for (let i = topAsks.length - 1; i >= 0; i--) {
      runningAskTotal += parseFloat(topAsks[i][1]) || 0;
      askTotals[i] = runningAskTotal;
    }
    const processedAsks = topAsks.map((item, idx) => ({
      price: parseFloat(item[0]),
      size: parseFloat(item[1]),
      total: askTotals[idx] || 0,
    }));

    let runningBidTotal = 0;
    const processedBids: Array<{ price: number; size: number; total: number }> = [];
    for (let i = 0; i < topBids.length; i++) {
      const item = topBids[i];
      runningBidTotal += parseFloat(item[1]) || 0;
      processedBids.push({
        price: parseFloat(item[0]),
        size: parseFloat(item[1]),
        total: runningBidTotal,
      });
    }

    // Imbalance calculation
    const totalAskVol = processedAsks.reduce((acc, a) => acc + a.size, 0);
    const totalBidVol = processedBids.reduce((acc, b) => acc + b.size, 0);
    const sumVol = totalAskVol + totalBidVol;
    const bidPct = sumVol > 0 ? Math.round((totalBidVol / sumVol) * 100) : 50;
    const askPct = 100 - bidPct;

    const maxCum = Math.max(
      processedAsks[0]?.total || 1,
      processedBids[processedBids.length - 1]?.total || 1,
      1
    );

    const bestAsk = processedAsks.length > 0 ? processedAsks[processedAsks.length - 1].price : 0;
    const bestBid = processedBids.length > 0 ? processedBids[0].price : 0;
    const spreadVal = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
    const spreadPct = bestAsk > 0 ? ((spreadVal / bestAsk) * 100).toFixed(2) : '0';

    // Pad to guaranteed 8 rows
    const asksList = Array.from({ length: ROW_COUNT }, (_, i) => {
      const offset = ROW_COUNT - processedAsks.length;
      return i >= offset ? processedAsks[i - offset] : null;
    });

    const bidsList = Array.from({ length: ROW_COUNT }, (_, i) => {
      return i < processedBids.length ? processedBids[i] : null;
    });

    return {
      paddedAsks: asksList,
      paddedBids: bidsList,
      bidPercent: bidPct,
      askPercent: askPct,
      maxCumulative: maxCum,
      spreadValue: spreadVal,
      spreadPercent: spreadPct,
    };
  }, [orderbook]);

  return (
    <div className="p-5 rounded-2xl bg-theme-bg-surface border border-theme-border-subtle flex flex-col gap-3 select-none shadow-xl shadow-black/20">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Layers className="size-4 text-theme-brand-primary stroke-[2.2]" />
        <span className="text-sm font-bold text-theme-text-primary tracking-tight">
          Order Book Depth
        </span>
      </div>

      {/* Depth Imbalance Bar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-2xs font-mono">
          <span className="text-theme-status-success font-bold">Bids {bidPercent}%</span>
          <span className="text-theme-text-muted text-3xs uppercase tracking-wider">Depth Imbalance</span>
          <span className="text-theme-status-danger font-bold">{askPercent}% Asks</span>
        </div>
        <div className="h-1.5 w-full bg-theme-bg-elevated rounded-full flex overflow-hidden">
          <div
            className="bg-theme-status-success h-full transition-all duration-300 rounded-l-full"
            style={{ width: `${bidPercent}%` }}
          />
          <div
            className="bg-theme-status-danger h-full transition-all duration-300 rounded-r-full"
            style={{ width: `${askPercent}%` }}
          />
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 text-3xs font-mono text-theme-text-muted uppercase tracking-wider px-1 pt-1">
        <span>PRICE (USDT)</span>
        <span className="text-center">SIZE</span>
        <span className="text-right">TOTAL</span>
      </div>

      {/* Asks List (8 Fixed Rows) */}
      <div className="flex flex-col gap-0.5">
        {paddedAsks.map((row, i) => {
          const depthWidth = row ? Math.min((row.total / maxCumulative) * 100, 100) : 0;

          return (
            <div
              key={`ask-slot-${i}`}
              className="relative grid grid-cols-3 h-[22px] items-center px-1 text-xs font-mono overflow-hidden rounded"
            >
              {row && (
                <div
                  className="absolute inset-y-0 right-0 bg-theme-status-danger/15 pointer-events-none rounded transition-[width] duration-150 ease-out"
                  style={{ width: `${depthWidth}%` }}
                />
              )}
              <span
                className={`relative z-10 font-medium tabular-nums ${
                  row ? 'text-theme-status-danger' : 'text-theme-text-muted/30'
                }`}
              >
                {row ? formatMarketPrice(row.price) : '—'}
              </span>
              <span
                className={`relative z-10 text-center tabular-nums ${
                  row ? 'text-theme-text-secondary' : 'text-theme-text-muted/30'
                }`}
              >
                {row ? formatBookSize(row.size) : '—'}
              </span>
              <span
                className={`relative z-10 text-right tabular-nums ${
                  row ? 'text-theme-text-secondary' : 'text-theme-text-muted/30'
                }`}
              >
                {row ? formatBookSize(row.total) : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Spread Indicator Box */}
      <div className="bg-theme-bg-base/40 border border-theme-border-subtle/60 rounded-lg py-1.5 px-3 flex items-center justify-between text-xs font-mono">
        <span className="text-theme-text-muted text-2xs uppercase tracking-wider font-semibold">
          SPREAD
        </span>
        <span className="text-theme-text-primary font-bold tabular-nums">
          ${formatSpread(spreadValue)}{' '}
          <span className="text-theme-text-secondary font-normal text-2xs">({spreadPercent}%)</span>
        </span>
      </div>

      {/* Bids List (8 Fixed Rows) */}
      <div className="flex flex-col gap-0.5">
        {paddedBids.map((row, i) => {
          const depthWidth = row ? Math.min((row.total / maxCumulative) * 100, 100) : 0;

          return (
            <div
              key={`bid-slot-${i}`}
              className="relative grid grid-cols-3 h-[22px] items-center px-1 text-xs font-mono overflow-hidden rounded"
            >
              {row && (
                <div
                  className="absolute inset-y-0 right-0 bg-theme-status-success/15 pointer-events-none rounded transition-[width] duration-150 ease-out"
                  style={{ width: `${depthWidth}%` }}
                />
              )}
              <span
                className={`relative z-10 font-medium tabular-nums ${
                  row ? 'text-theme-status-success' : 'text-theme-text-muted/30'
                }`}
              >
                {row ? formatMarketPrice(row.price) : '—'}
              </span>
              <span
                className={`relative z-10 text-center tabular-nums ${
                  row ? 'text-theme-text-secondary' : 'text-theme-text-muted/30'
                }`}
              >
                {row ? formatBookSize(row.size) : '—'}
              </span>
              <span
                className={`relative z-10 text-right tabular-nums ${
                  row ? 'text-theme-text-secondary' : 'text-theme-text-muted/30'
                }`}
              >
                {row ? formatBookSize(row.total) : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
