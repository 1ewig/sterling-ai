'use client';

import React, { memo, useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { AgentLoader } from '@/components/common';
import type { BitgetWsTickerData } from '@/lib/bitget/types';
import type { TickDirection, MicroCandle } from '@/hooks/market';

interface TickerDisplayProps {
  ticker: BitgetWsTickerData | null;
  candles: MicroCandle[];
  tickDirection: TickDirection;
  symbol: string;
}

export const TickerDisplay = memo(function TickerDisplay({
  ticker,
  candles,
  tickDirection,
  symbol,
}: TickerDisplayProps) {
  const baseAsset = symbol.replace(/USDT$|USD$|USDC$/, '');
  const quoteAsset = symbol.endsWith('USDC') ? 'USDC' : 'USDT';

  const price = ticker ? parseFloat(ticker.lastPr) : 0;
  const changeRatio = ticker ? parseFloat(ticker.change24h || '0') : 0;
  const isPositive = changeRatio >= 0;
  const high24h = ticker ? parseFloat(ticker.high24h || '0') : 0;
  const low24h = ticker ? parseFloat(ticker.low24h || '0') : 0;
  const baseVol = ticker ? parseFloat(ticker.baseVolume || '0') : 0;
  const quoteVol = ticker ? parseFloat(ticker.quoteVolume || '0') : 0;

  // Calculate range bar percentage
  const rangeSpan = high24h - low24h;
  const rangePercent =
    rangeSpan > 0 ? Math.min(Math.max(((price - low24h) / rangeSpan) * 100, 2), 98) : 50;

  // Format volume
  const formattedQuoteVol =
    quoteVol > 1_000_000_000
      ? `$${(quoteVol / 1_000_000_000).toFixed(2)}B`
      : quoteVol > 1_000_000
      ? `$${(quoteVol / 1_000_000).toFixed(2)}M`
      : `$${(quoteVol / 1_000).toFixed(2)}K`;

  const formattedBaseVol =
    baseVol > 10_000
      ? baseVol.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : baseVol.toFixed(4);

  // Sparkline data calculation (from 30m 1m candles)
  const sparklineData = useMemo(() => {
    if (!candles || candles.length < 2) {
      return null;
    }
    const closes = candles.map((c) => c.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;

    const width = 360;
    const height = 52;
    const paddingY = 8;
    const availableHeight = height - paddingY * 2;

    const points = closes.map((val, idx) => {
      const x = (idx / (closes.length - 1)) * width;
      const y = height - paddingY - ((val - min) / span) * availableHeight;
      return { x, y };
    });

    // Build SVG path
    const pathD = points.reduce((acc, pt, idx, arr) => {
      if (idx === 0) return `M ${pt.x},${pt.y}`;
      const prev = arr[idx - 1];
      const cx = (prev.x + pt.x) / 2;
      return `${acc} Q ${cx},${prev.y} ${cx},${(prev.y + pt.y) / 2} T ${pt.x},${pt.y}`;
    }, '');

    const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;
    const lastPoint = points[points.length - 1];

    return {
      pathD,
      areaD,
      lastPoint,
      minPrice: min,
      maxPrice: max,
      isUp: closes[closes.length - 1] >= closes[0],
    };
  }, [candles]);

  const formattedPrice =
    price >= 1000
      ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : price >= 1
      ? price.toFixed(4)
      : price.toFixed(6);

  if (!ticker) {
    return (
      <div className="p-6 rounded-2xl bg-theme-bg-surface border border-theme-border-subtle flex flex-col items-center justify-center min-h-[220px] gap-2.5 text-theme-text-muted">
        <AgentLoader className="size-5 text-theme-brand-primary" />
        <span className="text-xs font-mono">Connecting to {symbol}...</span>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-theme-bg-surface border border-theme-border-subtle flex flex-col gap-4 select-none shadow-xl shadow-black/20">
      {/* Top Asset Title & Change Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-extrabold tracking-tight text-theme-text-primary">
            {baseAsset} / {quoteAsset}
          </span>
          <span className="px-1.5 py-0.5 rounded text-3xs font-mono font-bold tracking-wide uppercase bg-theme-brand-primary/10 text-theme-brand-primary border border-theme-brand-primary/20">
            SPOT
          </span>
        </div>

        <div
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
            isPositive
              ? 'bg-theme-status-success/10 text-theme-status-success border-theme-status-success/20'
              : 'bg-theme-status-danger/10 text-theme-status-danger border-theme-status-danger/20'
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

      {/* Hero Last Price */}
      <div className="flex items-baseline">
        <span
          className={`text-4xl sm:text-[44px] font-extrabold font-mono tracking-tight transition-colors duration-200 ${
            tickDirection === 'up'
              ? 'text-theme-status-success'
              : tickDirection === 'down'
              ? 'text-theme-status-danger'
              : 'text-theme-text-primary'
          }`}
        >
          ${formattedPrice}
        </span>
      </div>

      {/* 24h Low / High Metric & Range Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-2xs font-mono text-theme-text-secondary">
          <span>24h Low: ${low24h.toLocaleString()}</span>
          <span>24h High: ${high24h.toLocaleString()}</span>
        </div>
        <div className="relative h-1 w-full bg-theme-bg-elevated rounded-full overflow-hidden">
          <div
            className="absolute top-0 bottom-0 left-0 bg-theme-brand-primary rounded-full transition-all duration-300"
            style={{ width: `${rangePercent}%` }}
          />
        </div>
      </div>

      {/* 30m Micro Trend Area Sparkline */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center justify-between text-2xs font-mono text-theme-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="text-theme-text-primary font-medium font-sans">30m Micro Trend</span>
            <span className="text-3xs px-1.5 py-0.5 rounded bg-theme-bg-elevated text-theme-text-muted font-mono">
              1m Candles
            </span>
          </div>
          {sparklineData && (
            <span className="text-3xs text-theme-text-secondary">
              L: ${sparklineData.minPrice.toLocaleString()} H: ${sparklineData.maxPrice.toLocaleString()}
            </span>
          )}
        </div>

        {/* Dynamic SVG Area Sparkline */}
        <div className="relative h-[52px] w-full overflow-hidden rounded-lg bg-theme-bg-base/40">
          {sparklineData ? (
            <svg viewBox="0 0 360 52" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="microTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={sparklineData.isUp ? '#10b981' : '#f43f5e'}
                    stopOpacity="0.28"
                  />
                  <stop
                    offset="100%"
                    stopColor={sparklineData.isUp ? '#10b981' : '#f43f5e'}
                    stopOpacity="0.0"
                  />
                </linearGradient>
              </defs>
              <path d={sparklineData.areaD} fill="url(#microTrendFill)" />
              <path
                d={sparklineData.pathD}
                fill="none"
                stroke={sparklineData.isUp ? '#10b981' : '#f43f5e'}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle
                cx={sparklineData.lastPoint.x}
                cy={sparklineData.lastPoint.y}
                r="3.5"
                fill={sparklineData.isUp ? '#10b981' : '#f43f5e'}
              />
            </svg>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-3xs font-mono text-theme-text-muted">
              Streaming candles...
            </div>
          )}
        </div>
      </div>

      {/* 24H Volume & Quote Volume Footer Row */}
      <div className="grid grid-cols-2 pt-1 border-t border-theme-border-subtle">
        <div className="flex flex-col">
          <span className="text-3xs font-mono uppercase text-theme-text-muted tracking-wider">
            24H VOLUME ({baseAsset})
          </span>
          <span className="text-sm font-bold font-mono text-theme-text-primary mt-0.5">
            {formattedBaseVol}
          </span>
        </div>

        <div className="flex flex-col items-end text-right">
          <span className="text-3xs font-mono uppercase text-theme-text-muted tracking-wider">
            24H QUOTE VOL
          </span>
          <span className="text-sm font-bold font-mono text-theme-text-primary mt-0.5">
            {formattedQuoteVol}
          </span>
        </div>
      </div>
    </div>
  );
});
