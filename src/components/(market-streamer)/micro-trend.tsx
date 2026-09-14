'use client';

import React, { memo, useMemo, useId } from 'react';
import type { MicroCandle } from '@/hooks/market';

interface MicroTrendProps {
  candles: MicroCandle[];
}

/**
 * 30m Micro Trend Sparkline Component.
 * Computes a smooth SVG bezier area curve from 1m candlestick close prices.
 */
export const MicroTrend = memo(function MicroTrend({ candles }: MicroTrendProps) {
  const gradientId = useId();

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

    // Build SVG smooth bezier path
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

  const colorVar = sparklineData?.isUp
    ? 'var(--theme-status-success)'
    : 'var(--theme-status-danger)';

  return (
    <div className="flex flex-col gap-1.5 pt-1">
      <div className="flex items-center justify-between text-2xs font-mono text-theme-text-secondary">
        <div className="flex items-center gap-1.5">
          <span className="text-theme-text-primary font-medium font-sans">30m Micro Trend</span>
          <span className="text-2xs px-1.5 py-0.5 rounded bg-theme-bg-elevated text-theme-text-muted font-mono">
            1m Candles
          </span>
        </div>
        {sparklineData && (
          <span className="text-2xs text-theme-text-secondary">
            L: ${sparklineData.minPrice.toLocaleString()} H: ${sparklineData.maxPrice.toLocaleString()}
          </span>
        )}
      </div>

      {/* Dynamic SVG Area Sparkline */}
      <div className="relative h-[52px] w-full overflow-hidden rounded-lg bg-theme-bg-base/40">
        {sparklineData ? (
          <svg viewBox="0 0 360 52" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={colorVar}
                  stopOpacity="0.28"
                />
                <stop
                  offset="100%"
                  stopColor={colorVar}
                  stopOpacity="0.0"
                />
              </linearGradient>
            </defs>
            <path d={sparklineData.areaD} fill={`url(#${gradientId})`} />
            <path
              d={sparklineData.pathD}
              fill="none"
              stroke={colorVar}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle
              cx={sparklineData.lastPoint.x}
              cy={sparklineData.lastPoint.y}
              r="3.5"
              fill={colorVar}
            />
          </svg>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-2xs font-mono text-theme-text-muted">
            Streaming candles...
          </div>
        )}
      </div>
    </div>
  );
});
