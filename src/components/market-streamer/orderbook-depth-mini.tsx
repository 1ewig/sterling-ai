'use client';

import React, { memo, useMemo } from 'react';
import { Layers } from 'lucide-react';
import type { BitgetWsBookData } from '@/lib/bitget/types';

interface OrderbookDepthMiniProps {
  orderbook: BitgetWsBookData | null;
}

const ROW_COUNT = 8;

export const OrderbookDepthMini = memo(function OrderbookDepthMini({
  orderbook,
}: OrderbookDepthMiniProps) {
  const rawAsks = orderbook?.asks || [];
  const rawBids = orderbook?.bids || [];

  // Take top 8 asks and reverse so lowest ask (best ask) is at bottom near spread
  const topAsks = [...rawAsks].slice(0, ROW_COUNT).reverse();
  const topBids = [...rawBids].slice(0, ROW_COUNT);

  // Compute cumulative totals
  const processedAsks = useMemo(() => {
    let runningTotal = 0;
    const totals: number[] = [];
    // Calculate cumulative total from best ask up
    for (let i = topAsks.length - 1; i >= 0; i--) {
      runningTotal += parseFloat(topAsks[i][1]) || 0;
      totals[i] = runningTotal;
    }
    return topAsks.map((item, idx) => ({
      price: parseFloat(item[0]),
      size: parseFloat(item[1]),
      total: totals[idx] || 0,
    }));
  }, [topAsks]);

  const processedBids = useMemo(() => {
    let runningTotal = 0;
    return topBids.map((item) => {
      runningTotal += parseFloat(item[1]) || 0;
      return {
        price: parseFloat(item[0]),
        size: parseFloat(item[1]),
        total: runningTotal,
      };
    });
  }, [topBids]);

  // Imbalance calculation
  const totalAskVol = processedAsks.reduce((acc, a) => acc + a.size, 0);
  const totalBidVol = processedBids.reduce((acc, b) => acc + b.size, 0);
  const sumVol = totalAskVol + totalBidVol;
  const bidPercent = sumVol > 0 ? Math.round((totalBidVol / sumVol) * 100) : 50;
  const askPercent = 100 - bidPercent;

  const maxCumulative = Math.max(
    processedAsks[0]?.total || 1,
    processedBids[processedBids.length - 1]?.total || 1,
    1
  );

  const bestAsk = processedAsks.length > 0 ? processedAsks[processedAsks.length - 1].price : 0;
  const bestBid = processedBids.length > 0 ? processedBids[0].price : 0;
  const spreadValue = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
  const spreadPercent = bestAsk > 0 ? ((spreadValue / bestAsk) * 100).toFixed(2) : '0';

  // Pad to guaranteed 8 rows
  const paddedAsks = Array.from({ length: ROW_COUNT }, (_, i) => {
    const offset = ROW_COUNT - processedAsks.length;
    return i >= offset ? processedAsks[i - offset] : null;
  });

  const paddedBids = Array.from({ length: ROW_COUNT }, (_, i) => {
    return i < processedBids.length ? processedBids[i] : null;
  });

  return (
    <div className="p-5 rounded-2xl bg-[#121215] border border-white/5 flex flex-col gap-3 select-none shadow-xl shadow-black/20">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Layers className="size-4 text-amber-400 stroke-[2.2]" />
        <span className="text-sm font-bold text-white tracking-tight">
          Order Book Depth
        </span>
      </div>

      {/* Depth Imbalance Bar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-2xs font-mono">
          <span className="text-emerald-400 font-bold">Bids {bidPercent}%</span>
          <span className="text-zinc-500 text-3xs uppercase tracking-wider">Depth Imbalance</span>
          <span className="text-rose-400 font-bold">{askPercent}% Asks</span>
        </div>
        <div className="h-1.5 w-full bg-zinc-800 rounded-full flex overflow-hidden">
          <div
            className="bg-emerald-400 h-full transition-all duration-300 rounded-l-full"
            style={{ width: `${bidPercent}%` }}
          />
          <div
            className="bg-rose-400 h-full transition-all duration-300 rounded-r-full"
            style={{ width: `${askPercent}%` }}
          />
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 text-3xs font-mono text-zinc-500 uppercase tracking-wider px-1 pt-1">
        <span>PRICE (USDT)</span>
        <span className="text-center">SIZE</span>
        <span className="text-right">TOTAL</span>
      </div>

      {/* Asks List (8 Fixed Rows) */}
      <div className="flex flex-col gap-0.5">
        {paddedAsks.map((row, i) => {
          if (!row) {
            return (
              <div
                key={`ask-placeholder-${i}`}
                className="grid grid-cols-3 h-[22px] items-center px-1 text-xs font-mono text-zinc-700"
              >
                <span>—</span>
                <span className="text-center">—</span>
                <span className="text-right">—</span>
              </div>
            );
          }

          const depthWidth = Math.min((row.total / maxCumulative) * 100, 100);

          return (
            <div
              key={`ask-${i}-${row.price}`}
              className="relative grid grid-cols-3 h-[22px] items-center px-1 text-xs font-mono overflow-hidden rounded"
            >
              <div
                className="absolute inset-y-0 right-0 bg-rose-500/12 pointer-events-none rounded"
                style={{ width: `${depthWidth}%` }}
              />
              <span className="relative z-10 text-rose-400 font-medium">
                {row.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="relative z-10 text-zinc-400 text-center">
                {row.size.toFixed(3)}
              </span>
              <span className="relative z-10 text-zinc-400 text-right">
                {row.total.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Spread Indicator Box */}
      <div className="bg-zinc-800/40 rounded-lg py-1.5 px-3 flex items-center justify-between text-xs font-mono">
        <span className="text-zinc-500 text-2xs uppercase tracking-wider font-semibold">
          SPREAD
        </span>
        <span className="text-white font-bold">
          ${spreadValue.toFixed(2)}{' '}
          <span className="text-zinc-400 font-normal text-2xs">({spreadPercent}%)</span>
        </span>
      </div>

      {/* Bids List (8 Fixed Rows) */}
      <div className="flex flex-col gap-0.5">
        {paddedBids.map((row, i) => {
          if (!row) {
            return (
              <div
                key={`bid-placeholder-${i}`}
                className="grid grid-cols-3 h-[22px] items-center px-1 text-xs font-mono text-zinc-700"
              >
                <span>—</span>
                <span className="text-center">—</span>
                <span className="text-right">—</span>
              </div>
            );
          }

          const depthWidth = Math.min((row.total / maxCumulative) * 100, 100);

          return (
            <div
              key={`bid-${i}-${row.price}`}
              className="relative grid grid-cols-3 h-[22px] items-center px-1 text-xs font-mono overflow-hidden rounded"
            >
              <div
                className="absolute inset-y-0 right-0 bg-emerald-500/12 pointer-events-none rounded"
                style={{ width: `${depthWidth}%` }}
              />
              <span className="relative z-10 text-emerald-400 font-medium">
                {row.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="relative z-10 text-zinc-400 text-center">
                {row.size.toFixed(3)}
              </span>
              <span className="relative z-10 text-zinc-400 text-right">
                {row.total.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
