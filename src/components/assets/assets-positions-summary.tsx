'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { Layers, ArrowUpRight, ArrowDownRight, Bot } from 'lucide-react';
import type { BitgetV3Position } from '@/lib/bitget/types';

export interface AssetsPositionsSummaryProps {
  positions: BitgetV3Position[];
}

export const AssetsPositionsSummary = memo(function AssetsPositionsSummary({
  positions,
}: AssetsPositionsSummaryProps) {
  if (positions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-theme-bg-surface border border-theme-border-subtle p-spacing-md shadow-xs flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-theme-brand-primary" />
          <h2 className="text-sm font-bold text-theme-text-primary tracking-tight">
            Active Margin Positions
          </h2>
          <span className="text-2xs font-mono px-2 py-0.5 rounded-full bg-theme-bg-elevated border border-theme-border-subtle text-theme-text-muted">
            {positions.length} open
          </span>
        </div>

        <Link
          href="/chat"
          className="text-2xs font-semibold text-theme-brand-primary hover:underline inline-flex items-center gap-1"
        >
          <Bot className="size-3" />
          <span>Ask Sterling to manage or hedge positions</span>
        </Link>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-theme-border-subtle text-2xs font-bold uppercase tracking-wider text-theme-text-secondary">
              <th className="py-2.5 px-3">Symbol</th>
              <th className="py-2.5 px-3">Side</th>
              <th className="py-2.5 px-3 text-right">Size</th>
              <th className="py-2.5 px-3 text-right">Entry Price</th>
              <th className="py-2.5 px-3 text-right">Mark Price</th>
              <th className="py-2.5 px-3 text-right">Liq. Price</th>
              <th className="py-2.5 px-3 text-right">Unrealized PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border-subtle">
            {positions.map((pos, idx) => {
              const isLong = pos.posSide === 'long';
              const pnlNum = parseFloat(pos.unrealisedPnl || '0');
              const isPnlPositive = pnlNum >= 0;
              const formattedPnl = (isPnlPositive ? '+' : '') + pnlNum.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });

              return (
                <tr key={`${pos.symbol}-${pos.posSide}-${idx}`} className="hover:bg-theme-bg-elevated/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-theme-text-primary whitespace-nowrap">
                    {pos.symbol}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs font-bold ${
                        isLong
                          ? 'bg-theme-status-success/15 text-theme-status-success'
                          : 'bg-theme-status-danger/15 text-theme-status-danger'
                      }`}
                    >
                      {isLong ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                      {pos.posSide.toUpperCase()} {pos.leverage}x
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-theme-text-primary whitespace-nowrap">
                    {pos.total}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-theme-text-secondary whitespace-nowrap">
                    ${parseFloat(pos.avgPrice || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-theme-text-secondary whitespace-nowrap">
                    ${parseFloat(pos.markPrice || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-theme-status-warning whitespace-nowrap">
                    ${parseFloat(pos.liquidationPrice || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                      isPnlPositive ? 'text-theme-status-success' : 'text-theme-status-danger'
                    }`}
                  >
                    ${formattedPnl}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});
