'use client';

import React from 'react';
import { Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { TechnicalIndicatorReport } from '@/lib/bitget/types';

interface TechnicalAnalysisCardProps {
  resultObj: Record<string, unknown>;
}

export const TechnicalAnalysisCard = React.memo(function TechnicalAnalysisCard({
  resultObj,
}: TechnicalAnalysisCardProps) {
  const data = resultObj as unknown as TechnicalIndicatorReport;
  const trend = data.trend || 'neutral';
  const isBullish = trend === 'bullish';
  const isBearish = trend === 'bearish';

  const rsi = data.indicators?.rsi14;
  const rsiSignal = data.indicators?.rsiSignal || 'neutral';
  const macd = data.indicators?.macd;
  const ema = data.indicators?.ema;
  const fib = data.indicators?.fibonacci;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-theme-bg-surface border border-theme-border-subtle shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-theme-brand-primary/10 text-theme-brand-primary">
            <Activity className="size-3.5" />
          </div>
          <span className="font-semibold text-xs text-theme-text-primary tracking-wide">
            {data.symbol || 'Technical Analysis'}
          </span>
          <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-theme-bg-elevated text-theme-text-muted">
            {data.granularity || '4h'}
          </span>
        </div>

        {/* Overall Trend Pill */}
        <span
          className={`flex items-center gap-1 text-2xs font-mono font-bold uppercase px-2 py-0.5 rounded ${
            isBullish
              ? 'bg-theme-status-success/15 text-theme-status-success border border-theme-status-success/20'
              : isBearish
              ? 'bg-theme-status-danger/15 text-theme-status-danger border border-theme-status-danger/20'
              : 'bg-theme-status-warning/15 text-theme-status-warning border border-theme-status-warning/20'
          }`}
        >
          {isBullish && <CheckCircle2 className="size-3" />}
          {isBearish && <ShieldAlert className="size-3" />}
          {trend} Structure
        </span>
      </div>

      {/* Indicator Dashboard Table */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-theme-border-subtle/40 text-2xs font-mono">
        {/* RSI */}
        {rsi !== undefined && (
          <div className="p-1.5 rounded bg-theme-bg-elevated/40 border border-theme-border-subtle/50">
            <span className="text-theme-text-muted block">RSI (14)</span>
            <span className="text-theme-text-primary font-bold">{rsi}</span>
            <span className="text-theme-text-secondary block text-3xs capitalize">{rsiSignal}</span>
          </div>
        )}

        {/* MACD */}
        {macd && (
          <div className="p-1.5 rounded bg-theme-bg-elevated/40 border border-theme-border-subtle/50">
            <span className="text-theme-text-muted block">MACD Hist</span>
            <span className={`font-bold ${macd.hist >= 0 ? 'text-theme-status-success' : 'text-theme-status-danger'}`}>
              {macd.hist > 0 ? '+' : ''}{macd.hist}
            </span>
            <span className="text-theme-text-secondary block text-3xs capitalize">{macd.signal.replace('_', ' ')}</span>
          </div>
        )}

        {/* EMA Trend */}
        {ema && (
          <div className="p-1.5 rounded bg-theme-bg-elevated/40 border border-theme-border-subtle/50">
            <span className="text-theme-text-muted block">EMA Alignment</span>
            <span className="text-theme-text-primary font-bold capitalize">{ema.alignment}</span>
            <span className="text-theme-text-secondary block text-3xs">20-EMA: ${ema.ema20}</span>
          </div>
        )}

        {/* Fibonacci Zone */}
        {fib && (
          <div className="p-1.5 rounded bg-theme-bg-elevated/40 border border-theme-border-subtle/50">
            <span className="text-theme-text-muted block">Fib Position</span>
            <span className="text-theme-text-primary font-bold truncate block">{fib.currentZone}</span>
            <span className="text-theme-text-secondary block text-3xs">0.618: ${fib.fib618}</span>
          </div>
        )}
      </div>
    </div>
  );
});
