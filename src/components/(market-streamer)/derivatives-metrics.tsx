'use client';

import React, { memo } from 'react';
import { Zap } from 'lucide-react';
import type { BitgetWsTickerData } from '@/lib/bitget/types';
import { useCountdownTimer } from '@/hooks/ui/use-countdown-timer';
import { formatMarketPrice, formatMarketVolume, parseAssetPair } from '@/lib/bitget';

interface DerivativesMetricsProps {
  futuresTicker: BitgetWsTickerData | null;
}

export const DerivativesMetrics = memo(function DerivativesMetrics({
  futuresTicker,
}: DerivativesMetricsProps) {
  const nextFundingTime = futuresTicker?.nextFundingTime
    ? parseInt(futuresTicker.nextFundingTime, 10)
    : 0;

  const { countdown } = useCountdownTimer(nextFundingTime);

  if (!futuresTicker || !futuresTicker.fundingRate) {
    return null;
  }

  const { baseAsset } = parseAssetPair(futuresTicker.instId);
  const fundingRate = parseFloat(futuresTicker.fundingRate || '0');
  const isFundingPositive = fundingRate >= 0;
  const fundingPercent = (fundingRate * 100).toFixed(4);

  const markPrice = parseFloat(futuresTicker.markPrice || '0');
  const indexPrice = parseFloat(futuresTicker.indexPrice || '0');
  const holdingAmount = parseFloat(futuresTicker.holdingAmount || futuresTicker.openInterest || '0');
  const lastPrice = parseFloat(futuresTicker.lastPr || '0');

  // Notional Open Interest (OI) in USD
  const notionalOI = holdingAmount * (markPrice || lastPrice);
  const formattedNotionalOI = formatMarketVolume(notionalOI);

  const formattedHolding =
    holdingAmount > 10_000
      ? holdingAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })
      : holdingAmount.toFixed(2);

  // Basis = Perpetual Price minus Index Price
  const basisValue = (lastPrice || markPrice) - indexPrice;
  const basisPercent = indexPrice > 0 ? ((basisValue / indexPrice) * 100).toFixed(2) : '0';

  const formattedMarkPrice = formatMarketPrice(markPrice);
  const formattedIndexPrice = formatMarketPrice(indexPrice);

  return (
    <div className="p-5 rounded-2xl bg-theme-bg-surface border border-theme-border-subtle flex flex-col gap-3.5 select-none shadow-xl shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-theme-brand-primary stroke-[2.2]" />
          <span className="text-sm font-bold text-theme-text-primary tracking-tight">
            Derivatives Flow
          </span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-2xs font-mono font-bold tracking-wide uppercase bg-theme-brand-primary/10 text-theme-brand-primary border border-theme-brand-primary/20">
          PERP
        </span>
      </div>

      {/* 2x2 Metric Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* 8H Funding Rate */}
        <div className="flex flex-col p-2.5 rounded-xl bg-theme-bg-base/40 border border-theme-border-subtle/60">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase text-theme-text-muted tracking-wider">
              8H FUNDING
            </span>
            <span className="text-2xs font-mono text-theme-text-muted" title="Countdown to next funding">
              {countdown}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span
              className={`text-base font-extrabold font-mono ${
                isFundingPositive ? 'text-theme-status-success' : 'text-theme-status-danger'
              }`}
            >
              {isFundingPositive ? '+' : ''}{fundingPercent}%
            </span>
          </div>
          <span className="text-2xs font-mono text-theme-text-muted mt-0.5">
            {isFundingPositive ? 'Longs pay shorts' : 'Shorts pay longs'}
          </span>
        </div>

        {/* Open Interest (OI) */}
        <div className="flex flex-col p-2.5 rounded-xl bg-theme-bg-base/40 border border-theme-border-subtle/60">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase text-theme-text-muted tracking-wider">
              OPEN INTEREST
            </span>
            <span className="text-2xs font-mono text-theme-brand-primary font-medium">
              Live
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-base font-extrabold font-mono text-theme-text-primary">
              {formattedNotionalOI}
            </span>
          </div>
          <span className="text-2xs font-mono text-theme-text-secondary truncate mt-0.5">
            {formattedHolding} {baseAsset}
          </span>
        </div>

        {/* Mark Price */}
        <div className="flex flex-col p-2.5 rounded-xl bg-theme-bg-base/40 border border-theme-border-subtle/60">
          <span className="text-2xs font-mono uppercase text-theme-text-muted tracking-wider">
            MARK PRICE
          </span>
          <span className="text-base font-bold font-mono text-theme-text-primary mt-1">
            ${formattedMarkPrice}
          </span>
          <span className="text-2xs font-mono text-theme-text-muted mt-0.5">
            Liquidation baseline
          </span>
        </div>

        {/* Index Price & Basis */}
        <div className="flex flex-col p-2.5 rounded-xl bg-theme-bg-base/40 border border-theme-border-subtle/60">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase text-theme-text-muted tracking-wider">
              INDEX PRICE
            </span>
            <span
              className={`text-2xs font-mono font-medium ${
                basisValue >= 0 ? 'text-theme-status-success' : 'text-theme-status-warning'
              }`}
            >
              {basisValue >= 0 ? 'Contango' : 'Discount'}
            </span>
          </div>
          <span className="text-base font-bold font-mono text-theme-text-primary mt-1">
            ${formattedIndexPrice}
          </span>
          <span className="text-2xs font-mono text-theme-text-muted mt-0.5 truncate">
            Basis: {basisValue >= 0 ? '+' : ''}${basisValue.toFixed(2)} ({basisPercent}%)
          </span>
        </div>
      </div>
    </div>
  );
});
