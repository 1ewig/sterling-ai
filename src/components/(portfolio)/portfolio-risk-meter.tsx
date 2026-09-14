'use client';

import React, { memo } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export interface PortfolioRiskMeterProps {
  marginRatioPercent: number;
  positionMgnRatioPercent?: number;
  positionValue?: number;
}

export const PortfolioRiskMeter = memo(function PortfolioRiskMeter({
  marginRatioPercent,
  positionMgnRatioPercent = 0,
  positionValue = 0,
}: PortfolioRiskMeterProps) {
  // MMR Risk zoning
  // < 50%: Safe, 50-80%: Moderate / Caution, > 80%: High risk of forced liquidation
  const clampedMMR = Math.min(Math.max(marginRatioPercent, 0), 100);

  let statusText = 'Low Risk (Safe)';
  let statusColorClass = 'text-theme-status-success';
  let badgeColorClass = 'bg-theme-status-success/10 text-theme-status-success border-theme-status-success/20';
  let barColorClass = 'bg-theme-status-success';

  if (marginRatioPercent >= 80) {
    statusText = 'Critical Risk (Near Liquidation)';
    statusColorClass = 'text-theme-status-danger';
    badgeColorClass = 'bg-theme-status-danger/10 text-theme-status-danger border-theme-status-danger/20';
    barColorClass = 'bg-theme-status-danger';
  } else if (marginRatioPercent >= 50) {
    statusText = 'Elevated Risk (Caution)';
    statusColorClass = 'text-theme-status-warning';
    badgeColorClass = 'bg-theme-status-warning/10 text-theme-status-warning border-theme-status-warning/20';
    barColorClass = 'bg-theme-status-warning';
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-theme-bg-surface border border-theme-border-subtle p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-theme-border-subtle/60 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-theme-text-primary">
            Account Margin Health (MMR)
          </h2>
          <span className={`px-2 py-0.5 rounded-full text-2xs font-mono font-semibold border ${badgeColorClass} inline-flex items-center gap-1`}>
            {marginRatioPercent >= 50 ? <AlertTriangle className="size-3" /> : <ShieldCheck className="size-3" />}
            {statusText}
          </span>
        </div>

        <div className="text-2xs text-theme-text-muted font-mono flex items-center gap-3">
          <span>MMR: <strong className={statusColorClass}>{marginRatioPercent.toFixed(2)}%</strong></span>
          <span>Position MMR: <strong className="text-theme-text-secondary">{positionMgnRatioPercent.toFixed(2)}%</strong></span>
          <span>Notional: <strong className="text-theme-text-secondary">${positionValue.toFixed(2)}</strong></span>
        </div>
      </div>

      {/* Progress Bar with 50% and 80% Threshold Markers */}
      <div className="relative w-full h-2 rounded-full bg-theme-bg-elevated border border-theme-border-subtle overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColorClass}`}
          style={{ width: `${clampedMMR}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-2xs text-theme-text-muted font-mono">
        <span>0% (Zero Margin)</span>
        <span>50% Caution</span>
        <span className="text-theme-status-danger font-medium">80% Liquidation Alert</span>
        <span>100% (Call)</span>
      </div>
    </div>
  );
});
