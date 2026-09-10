'use client';

import React from 'react';
import { Layers, ShieldCheck, Flame } from 'lucide-react';
import type { MarketIntelData } from '@/lib/bitget/types';

interface MarketIntelCardProps {
  resultObj: Record<string, unknown>;
}

export const MarketIntelCard = React.memo(function MarketIntelCard({ resultObj }: MarketIntelCardProps) {
  const data = resultObj as unknown as MarketIntelData;
  const tvl = data.defi?.totalTvl || '$98.4B';
  const stables = data.defi?.stablecoinSupply || '$168.5B';
  const gas = data.networkHealth?.ethGasGwei ?? 12;
  const trending = data.dexTrending || [];

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-theme-bg-surface border border-theme-border-subtle shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-theme-brand-primary/10 text-theme-brand-primary">
            <Layers className="size-3.5" />
          </div>
          <span className="font-semibold text-xs text-theme-text-primary tracking-wide">
            DeFi & On-Chain Intelligence
          </span>
        </div>

        <div className="flex items-center gap-1 text-2xs font-mono text-theme-text-secondary">
          <ShieldCheck className="size-3 text-theme-brand-primary" />
          <span>Gas: {gas} Gwei</span>
        </div>
      </div>

      {/* Top DeFi Stats */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-theme-border-subtle/40 text-2xs font-mono">
        <div className="p-1.5 rounded bg-theme-bg-elevated/40 border border-theme-border-subtle/50">
          <span className="text-theme-text-muted block">DeFi Total TVL</span>
          <span className="text-theme-text-primary font-bold">{tvl}</span>
        </div>

        <div className="p-1.5 rounded bg-theme-bg-elevated/40 border border-theme-border-subtle/50">
          <span className="text-theme-text-muted block">Stablecoin Dry Powder</span>
          <span className="text-theme-text-primary font-bold">{stables}</span>
        </div>
      </div>

      {/* Trending Tokens Pill Strip */}
      {trending.length > 0 && (
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto custom-scrollbar">
          <span className="text-3xs font-mono text-theme-text-muted flex items-center gap-0.5 shrink-0">
            <Flame className="size-2.5 text-theme-status-warning" /> Trending:
          </span>
          {trending.map((t) => (
            <span
              key={t.symbol}
              className="text-3xs font-mono font-medium px-1.5 py-0.5 rounded bg-theme-bg-elevated border border-theme-border-subtle text-theme-text-secondary shrink-0"
            >
              {t.symbol} <span className="text-theme-status-success">{t.change24h}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
});
