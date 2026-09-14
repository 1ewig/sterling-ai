'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ShieldAlert, XCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { tapScalePill } from '@/constants/animation';
import type { BitgetV3Position } from '@/lib/bitget/types';

export interface PositionsTableProps {
  positions: BitgetV3Position[];
  isPending: boolean;
  onClosePosition: (
    symbol: string,
    category: string,
    side: 'buy' | 'sell',
    size?: string,
    posSide?: 'long' | 'short' | 'net'
  ) => Promise<{ success: boolean; message?: string }>;
}

export const PositionsTable = React.memo(function PositionsTable({
  positions,
  isPending,
  onClosePosition,
}: PositionsTableProps) {
  const [closingKey, setClosingKey] = useState<string | null>(null);

  const handleClose = async (p: BitgetV3Position) => {
    const key = `${p.symbol}-${p.posSide}`;
    setClosingKey(key);

    const isLong = p.posSide === 'long' || (p.posSide === 'net' && parseFloat(p.total) > 0);
    const executionSide: 'buy' | 'sell' = isLong ? 'sell' : 'buy';

    try {
      await onClosePosition(p.symbol, 'usdt-futures', executionSide, undefined, p.posSide);
    } catch {
      // Error handled by hook
    } finally {
      setClosingKey(null);
    }
  };

  if (positions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-theme-bg-surface border border-theme-border-subtle p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-theme-border-subtle/60 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-theme-text-primary">
            Active Perpetual & Equity Positions
          </h2>
          <span className="text-2xs font-mono font-semibold px-2 py-0.5 rounded-full bg-theme-bg-elevated text-theme-text-secondary border border-theme-border-subtle">
            {positions.length}
          </span>
        </div>
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
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border-subtle/40 text-xs">
            {positions.map((p) => {
              const totalNum = parseFloat(p.total || '0');
              const isLong = p.posSide === 'long' || (p.posSide === 'net' && totalNum > 0);
              const uPnlNum = parseFloat(p.unrealisedPnl || '0');
              const isPnlPositive = uPnlNum >= 0;
              const entryPrice = parseFloat(p.avgPrice || p.openPriceAvg || '0');
              const markPrice = parseFloat(p.markPrice || '0');
              const liqPrice = parseFloat(p.liquidationPrice || '0');

              // Liquidation cushion %
              let liqDistancePct: number | null = null;
              if (liqPrice > 0 && markPrice > 0) {
                liqDistancePct = Math.abs((markPrice - liqPrice) / markPrice) * 100;
              }
              const isLiqNear = liqDistancePct !== null && liqDistancePct < 15;

              return (
                <tr key={`${p.symbol}-${p.posSide}-${p.cTime}`} className="hover:bg-theme-bg-elevated/30 transition-colors">
                  {/* Symbol */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-theme-text-primary tracking-tight">
                        {p.symbol}
                      </span>
                      {p.marginMode && (
                        <span className="text-3xs uppercase px-1.5 py-0.5 rounded bg-theme-bg-elevated text-theme-text-muted border border-theme-border-subtle/60 font-mono">
                          {p.marginMode}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Side & Leverage */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-2xs font-bold font-mono uppercase ${
                          isLong
                            ? 'bg-theme-status-success/10 text-theme-status-success border border-theme-status-success/20'
                            : 'bg-theme-status-error/10 text-theme-status-error border border-theme-status-error/20'
                        }`}
                      >
                        {isLong ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                        {isLong ? 'Long' : 'Short'}
                      </span>
                      <span className="text-2xs font-mono text-theme-text-muted">
                        {p.leverage}x
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
                  <td className="py-3 px-3 text-right font-mono">
                    {liqPrice > 0 ? (
                      <div className="flex flex-col items-end">
                        <span className={isLiqNear ? 'text-theme-status-error font-bold flex items-center gap-1' : 'text-theme-text-muted'}>
                          {isLiqNear && <ShieldAlert className="size-3 text-theme-status-error" />}
                          ${liqPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {liqDistancePct !== null && (
                          <span className={`text-3xs ${isLiqNear ? 'text-theme-status-error' : 'text-theme-text-muted'}`}>
                            {liqDistancePct.toFixed(1)}% buffer
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-theme-text-muted">--</span>
                    )}
                  </td>

                  {/* Unrealized PnL */}
                  <td className="py-3 px-3 text-right font-mono">
                    <div className="flex flex-col items-end">
                      <span
                        className={`font-bold flex items-center gap-0.5 ${
                          isPnlPositive ? 'text-theme-status-success' : 'text-theme-status-error'
                        }`}
                      >
                        {isPnlPositive ? (
                          <TrendingUp className="size-3" />
                        ) : (
                          <TrendingDown className="size-3" />
                        )}
                        {isPnlPositive ? '+' : ''}
                        ${uPnlNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {p.profitRate && (
                        <span className={`text-3xs ${isPnlPositive ? 'text-theme-status-success' : 'text-theme-status-error'}`}>
                          {(parseFloat(p.profitRate) * 100).toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Action Button */}
                  <td className="py-3 px-3 text-center">
                    <motion.button
                      type="button"
                      whileTap={tapScalePill}
                      onClick={() => handleClose(p)}
                      disabled={isPending || closingKey !== null}
                      className="h-7 px-2.5 text-2xs font-bold rounded bg-theme-status-error/10 hover:bg-theme-status-error/20 text-theme-status-error border border-theme-status-error/30 inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 select-none"
                      title="Close position at market"
                    >
                      <XCircle className="size-3" />
                      <span>Close</span>
                    </motion.button>
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
