'use client';

import React from 'react';
import { Gauge, Users, AlertCircle } from 'lucide-react';
import type { SentimentAnalystData } from '@/agent/types';

interface SentimentAnalystCardProps {
  resultObj: Record<string, unknown>;
}

export const SentimentAnalystCard = React.memo(function SentimentAnalystCard({
  resultObj,
}: SentimentAnalystCardProps) {
  const data = resultObj as unknown as SentimentAnalystData;
  const fng = data.fearAndGreedIndex?.current ?? 50;
  const fngLabel = data.fearAndGreedIndex?.sentiment || 'Neutral';
  const retailLS = data.derivatives?.retailLongShortRatio ?? 1.0;
  const topTraderLS = data.derivatives?.topTraderLongShortRatio ?? 1.0;
  const divergence = data.derivatives?.divergence;
  const positioningRisk = data.positioningRisk || 'Moderate / Balanced';

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-theme-bg-surface border border-theme-border-subtle shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-theme-brand-primary/10 text-theme-brand-primary">
            <Gauge className="size-3.5" />
          </div>
          <span className="font-semibold text-xs text-theme-text-primary tracking-wide">
            Market Sentiment & Positioning
          </span>
        </div>

        {/* Risk Badge */}
        <span className="text-2xs font-mono font-semibold px-2 py-0.5 rounded bg-theme-bg-elevated border border-theme-border-subtle text-theme-text-secondary flex items-center gap-1">
          <AlertCircle className="size-2.5 text-theme-brand-primary" />
          {positioningRisk}
        </span>
      </div>

      {/* Sentiment Gauge & Derivatives Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-theme-border-subtle/40 text-2xs font-mono">
        {/* Fear & Greed Meter */}
        <div className="p-2 rounded bg-theme-bg-elevated/40 border border-theme-border-subtle/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-theme-text-muted">Fear & Greed</span>
            <span className="text-theme-text-primary font-bold">{fng}/100</span>
          </div>
          <div className="w-full bg-theme-border-subtle h-1.5 rounded-full overflow-hidden my-1">
            <div
              className={`h-full rounded-full ${
                fng >= 75 ? 'bg-theme-status-warning' : fng >= 50 ? 'bg-theme-status-success' : 'bg-theme-status-danger'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, fng))}%` }}
            />
          </div>
          <span className="text-theme-text-secondary text-3xs font-medium">{fngLabel}</span>
        </div>

        {/* Top Trader vs Retail Long/Short */}
        <div className="p-2 rounded bg-theme-bg-elevated/40 border border-theme-border-subtle/50 flex flex-col justify-between">
          <span className="text-theme-text-muted flex items-center gap-1">
            <Users className="size-2.5" /> Top Trader L/S
          </span>
          <span className="text-theme-text-primary font-bold text-xs">{topTraderLS.toFixed(2)}x</span>
          <span className="text-theme-text-muted text-3xs">Retail: {retailLS.toFixed(2)}x</span>
        </div>

        {/* Smart Money Divergence */}
        <div className="p-2 rounded bg-theme-bg-elevated/40 border border-theme-border-subtle/50 flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-theme-text-muted">Divergence</span>
          <span className="text-theme-brand-primary font-bold text-xs truncate">
            {divergence || 'Balanced'}
          </span>
          <span className="text-theme-text-secondary text-3xs">Funding: {data.derivatives?.fundingRate || '+0.01%'}</span>
        </div>
      </div>
    </div>
  );
});
