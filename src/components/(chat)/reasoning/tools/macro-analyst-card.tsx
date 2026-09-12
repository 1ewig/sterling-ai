'use client';

import React from 'react';
import { Globe, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { MacroAnalystData } from '@/agent/types';

interface MacroAnalystCardProps {
  resultObj: Record<string, unknown>;
}

export const MacroAnalystCard = React.memo(function MacroAnalystCard({ resultObj }: MacroAnalystCardProps) {
  const data = resultObj as unknown as MacroAnalystData;
  const verdict = data.verdict || 'MIXED';
  const isRiskOn = verdict === 'RISK-ON';
  const isRiskOff = verdict === 'RISK-OFF';

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-theme-bg-surface border border-theme-border-subtle shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-theme-brand-primary/10 text-theme-brand-primary">
            <Globe className="size-3.5" />
          </div>
          <span className="font-semibold text-xs text-theme-text-primary tracking-wide">
            Macro Environment & Yields
          </span>
        </div>

        {/* Verdict Badge */}
        <span
          className={`flex items-center gap-1 text-2xs font-mono font-bold uppercase px-2 py-0.5 rounded ${
            isRiskOn
              ? 'bg-theme-status-success/15 text-theme-status-success border border-theme-status-success/20'
              : isRiskOff
              ? 'bg-theme-status-danger/15 text-theme-status-danger border border-theme-status-danger/20'
              : 'bg-theme-status-warning/15 text-theme-status-warning border border-theme-status-warning/20'
          }`}
        >
          {isRiskOn ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
          {verdict} Regime
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-theme-border-subtle/40 text-2xs font-mono">
        <div className="p-1.5 rounded bg-theme-bg-elevated/40 border border-theme-border-subtle/50">
          <span className="text-theme-text-muted block">Fed Target Rate</span>
          <span className="text-theme-text-primary font-bold">{data.rates?.fedFundsTarget || '5.25%–5.50%'}</span>
        </div>

        <div className="p-1.5 rounded bg-theme-bg-elevated/40 border border-theme-border-subtle/50">
          <span className="text-theme-text-muted block">10Y-2Y Spread</span>
          <span
            className={`font-bold ${
              data.rates?.yieldCurveInverted ? 'text-theme-status-danger' : 'text-theme-status-success'
            }`}
          >
            {data.rates?.spread10y2y ? `${data.rates.spread10y2y} bp` : 'Normalizing'}
          </span>
        </div>

        <div className="p-1.5 rounded bg-theme-bg-elevated/40 border border-theme-border-subtle/50">
          <span className="text-theme-text-muted block">US CPI Inflation</span>
          <span className="text-theme-text-primary font-bold">{data.indicators?.cpi || '2.9%'}</span>
        </div>

        <div className="p-1.5 rounded bg-theme-bg-elevated/40 border border-theme-border-subtle/50">
          <span className="text-theme-text-muted flex items-center gap-1">
            <TrendingUp className="size-2.5" /> BTC/NDX Corr
          </span>
          <span className="text-theme-text-primary font-bold">{data.correlations?.btcNdx || '+0.68'}</span>
        </div>
      </div>
    </div>
  );
});
