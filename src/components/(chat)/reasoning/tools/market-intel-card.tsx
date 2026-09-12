'use client';

import React from 'react';
import { Layers, ShieldCheck, Flame, PieChart } from 'lucide-react';
import type { MarketIntelData } from '@/agent/types';

interface MarketIntelCardProps {
  resultObj: Record<string, unknown>;
}

export const MarketIntelCard = React.memo(function MarketIntelCard({ resultObj }: MarketIntelCardProps) {
  const data = resultObj as unknown as MarketIntelData;
  const tvl = data.defi?.totalTvl || '$98.4B';
  const stables = data.defi?.stablecoinSupply || '$168.5B';
  const gas = data.networkHealth?.ethGasGwei ?? 12;
  const trending = data.dexTrending || [];
  const topChains = data.defi?.topChains || [];
  const source = data.source || 'defillama + datahub_mcp';

  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-lg bg-theme-bg-surface border border-theme-border-subtle shadow-sm w-full max-w-lg">
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

        <div className="flex items-center gap-2 text-2xs font-mono text-theme-text-secondary">
          <span className="text-3xs text-theme-text-muted px-1.5 py-0.5 rounded bg-theme-bg-elevated border border-theme-border-subtle/50">
            {source.includes('defillama') ? 'Live DeFiLlama' : 'Desk Intel'}
          </span>
          <div className="flex items-center gap-1 text-theme-text-secondary">
            <ShieldCheck className="size-3 text-theme-brand-primary" />
            <span>Gas: {gas} Gwei</span>
          </div>
        </div>
      </div>

      {/* Top DeFi Stats */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-theme-border-subtle/40 text-2xs font-mono">
        <div className="p-2 rounded bg-theme-bg-elevated/40 border border-theme-border-subtle/50">
          <span className="text-theme-text-muted block text-3xs uppercase tracking-wider mb-0.5">DeFi Total TVL</span>
          <span className="text-theme-text-primary font-bold text-xs">{tvl}</span>
        </div>

        <div className="p-2 rounded bg-theme-bg-elevated/40 border border-theme-border-subtle/50">
          <span className="text-theme-text-muted block text-3xs uppercase tracking-wider mb-0.5">Stablecoin Reserves</span>
          <span className="text-theme-text-primary font-bold text-xs">{stables}</span>
        </div>
      </div>

      {/* Top Chains Allocation */}
      {topChains.length > 0 && (
        <div className="flex flex-col gap-1.5 p-2 rounded bg-theme-bg-elevated/30 border border-theme-border-subtle/40">
          <div className="flex items-center justify-between text-3xs font-mono text-theme-text-muted">
            <span className="flex items-center gap-1">
              <PieChart className="size-2.5 text-theme-brand-primary" /> Top Chains by TVL
            </span>
            <span>Market Share</span>
          </div>

          <div className="flex flex-col gap-1">
            {topChains.slice(0, 4).map((chain) => (
              <div key={chain.name} className="flex items-center justify-between text-2xs font-mono">
                <span className="text-theme-text-secondary font-medium">
                  {chain.name} <span className="text-theme-text-muted font-normal">({chain.tvl})</span>
                </span>
                <span className="text-theme-brand-primary font-semibold">{chain.share}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Tokens Pill Strip */}
      {trending.length > 0 && (
        <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto custom-scrollbar">
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

