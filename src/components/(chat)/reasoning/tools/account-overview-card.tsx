'use client';

import React from 'react';
import { Wallet, TrendingUp, TrendingDown, Shield } from 'lucide-react';

interface PositionItem {
  symbol: string;
  holdSide: 'long' | 'short' | 'net';
  size: string;
  leverage: string;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  marginMode: string;
}

interface AccountOverviewData {
  accountMode?: string;
  totalEquityUsdt?: number;
  availableEquityUsdt?: number;
  unrealizedPnlUsdt?: number;
  marginRatioPercent?: number;
  positionCount?: number;
  positions?: PositionItem[];
  summary?: string;
}

export const AccountOverviewCard = React.memo(function AccountOverviewCard({
  resultObj,
}: {
  resultObj: Record<string, unknown>;
}) {
  const data = resultObj as unknown as AccountOverviewData;
  const positions = data.positions || [];
  const totalPnl = data.unrealizedPnlUsdt || 0;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-theme-bg-surface border border-theme-border-subtle text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-theme-border-subtle/50 pb-2">
        <div className="flex items-center gap-1.5">
          <Wallet className="size-4 text-theme-brand-primary" />
          <span className="font-semibold text-theme-text-primary uppercase tracking-wide">
            Bitget v3 Account Overview
          </span>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-theme-brand-primary/10 text-theme-brand-primary text-2xs font-mono font-bold uppercase">
          {data.accountMode || 'UTA'} Mode
        </span>
      </div>

      {/* Equity & PnL Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
        <div className="flex flex-col bg-theme-bg-elevated/40 p-2 rounded">
          <span className="text-theme-text-muted text-2xs uppercase">Total Equity</span>
          <span className="font-mono font-bold text-theme-text-primary">
            ${(data.totalEquityUsdt || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex flex-col bg-theme-bg-elevated/40 p-2 rounded">
          <span className="text-theme-text-muted text-2xs uppercase">Unrealized PnL</span>
          <span
            className={`font-mono font-bold flex items-center gap-1 ${
              totalPnl >= 0 ? 'text-theme-status-success' : 'text-theme-status-danger'
            }`}
          >
            {totalPnl >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </span>
        </div>
        <div className="flex flex-col bg-theme-bg-elevated/40 p-2 rounded col-span-2 sm:col-span-1">
          <span className="text-theme-text-muted text-2xs uppercase">Open Contracts</span>
          <span className="font-mono font-bold text-theme-text-primary">
            {positions.length} active
          </span>
        </div>
      </div>

      {/* Positions Ladder */}
      {positions.length > 0 ? (
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-2xs font-mono text-theme-text-muted uppercase tracking-wider">
            Active Positions
          </span>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar">
            {positions.map((pos, idx) => {
              const isLong = pos.holdSide === 'long';
              const pnl = pos.unrealizedPnl;
              return (
                <div
                  key={`${pos.symbol}-${idx}`}
                  className="flex items-center justify-between p-2 rounded bg-theme-bg-elevated/30 border border-theme-border-subtle/30 text-2xs font-mono"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-1 py-0.5 rounded font-bold uppercase ${
                        isLong
                          ? 'bg-theme-status-success/15 text-theme-status-success'
                          : 'bg-theme-status-danger/15 text-theme-status-danger'
                      }`}
                    >
                      {pos.holdSide}
                    </span>
                    <span className="font-bold text-theme-text-primary">{pos.symbol}</span>
                    <span className="text-theme-text-muted">{pos.leverage}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-col text-right">
                      <span className="text-theme-text-muted">Entry: ${pos.entryPrice}</span>
                      <span className="text-theme-text-muted">Mark: ${pos.markPrice}</span>
                    </div>
                    <span
                      className={`font-bold ${
                        pnl >= 0 ? 'text-theme-status-success' : 'text-theme-status-danger'
                      }`}
                    >
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 p-2 rounded bg-theme-bg-elevated/20 text-theme-text-muted text-2xs">
          <Shield className="size-3.5 text-theme-brand-primary" />
          <span>No active positions open. Capital is 100% idle and available.</span>
        </div>
      )}
    </div>
  );
});
