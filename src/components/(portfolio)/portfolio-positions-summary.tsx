'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, Bot } from 'lucide-react';
import type { BitgetV3Position } from '@/lib/bitget/types';

export interface PortfolioPositionsSummaryProps {
  positions: BitgetV3Position[];
}

export const PortfolioPositionsSummary = memo(function PortfolioPositionsSummary({
  positions,
}: PortfolioPositionsSummaryProps) {
  if (positions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-theme-bg-surface border border-theme-border-subtle p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-theme-border-subtle/60 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-theme-text-primary">
            Active Margin Positions
          </h2>
          <span className="text-2xs font-mono font-semibold px-2 py-0.5 rounded-full bg-theme-bg-elevated text-theme-text-secondary border border-theme-border-subtle">
            {positions.length}
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

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-theme-border-subtle/80 text-2xs font-semibold text-theme-text-muted uppercase tracking-wider">
              <th className="py-2.5 px-3">Contract / Symbol</th>
              <th className="py-2.5 px-3">Side & Leverage</th>
              <th className="py-2.5 px-3 text-right">Size</th>
              <th className="py-2.5 px-3 text-right">Entry Price</th>
              <th className="py-2.5 px-3 text-right">Mark Price</th>
              <th className="py-2.5 px-3 text-right">Liq. Price</th>
              <th className="py-2.5 px-3 text-right">Unrealized PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border-subtle/40 text-xs">
            {positions.map((pos, idx) => {
              const totalNum = parseFloat(pos.total || '0');
              const isLong = pos.posSide === 'long' || (pos.posSide === 'net' && totalNum > 0);
              const pnlNum = parseFloat(pos.unrealisedPnl || '0');
              const isPnlPositive = pnlNum >= 0;
              const entryPrice = parseFloat(pos.avgPrice || pos.openPriceAvg || '0');
              const markPrice = parseFloat(pos.markPrice || '0');
              const liqPrice = parseFloat(pos.liquidationPrice || '0');

              return (
                <tr key={`${pos.symbol}-${pos.posSide}-${idx}`} className="hover:bg-theme-bg-elevated/30 transition-colors">
                  {/* Symbol */}
                  <td className="py-3 px-3">
                    <span className="font-bold text-theme-text-primary tracking-tight">
                      {pos.symbol}
                    </span>
                  </td>

                  {/* Side & Leverage */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-2xs font-bold font-mono uppercase ${
                          isLong
                            ? 'bg-theme-status-success/10 text-theme-status-success border border-theme-status-success/20'
                            : 'bg-theme-status-danger/10 text-theme-status-danger border border-theme-status-danger/20'
                        }`}
                      >
                        {isLong ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                        {isLong ? 'Long' : 'Short'}
                      </span>
                      <span className="text-2xs font-mono text-theme-text-muted">
                        {pos.leverage}x
                      </span>
                    </div>
                  </td>

                  {/* Size */}
                  <td className="py-3 px-3 text-right font-mono font-medium text-theme-text-primary">
                    {Math.abs(totalNum).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </td>

                  {/* Entry Price */}
                  <td className="py-3 px-3 text-right font-mono text-theme-text-secondary">
                    ${entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </td>

                  {/* Mark Price */}
                  <td className="py-3 px-3 text-right font-mono font-semibold text-theme-text-primary">
                    ${markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </td>

                  {/* Liquidation Price */}
                  <td className="py-3 px-3 text-right font-mono text-theme-text-muted">
                    {liqPrice > 0 ? (
                      `$${liqPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    ) : (
                      '--'
                    )}
                  </td>

                  {/* Unrealized PnL */}
                  <td className="py-3 px-3 text-right font-mono">
                    <span
                      className={`font-bold ${
                        isPnlPositive ? 'text-theme-status-success' : 'text-theme-status-danger'
                      }`}
                    >
                      {isPnlPositive ? '+' : ''}${pnlNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
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
