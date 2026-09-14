'use client';

import React, { useEffect, useMemo } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, ExternalLink, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useStagedActions, useExecuteTrade } from '@/hooks/chat';
import { formatUSD } from '@/lib/bitget/formatters';
import { SideBadge, CategoryBadge } from './tool-badge';
import { MetricTile, MetricGrid } from './metric-tile';

interface TradeTicketData {
  ticketId?: string;
  ticketToken?: string;
  symbol?: string;
  category?: string;
  side?: 'buy' | 'sell';
  orderType?: 'limit' | 'market';
  size?: number;
  price?: number;
  tradeSide?: string;
  leverage?: number;
  notionalUsdt?: number;
  initialMarginUsdt?: number;
  estimatedLiquidation?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  riskRewardRatio?: string;
  rationale?: string;
  status?: string;
}

export const TradeTicketCard = React.memo(function TradeTicketCard({
  resultObj,
}: {
  resultObj: Record<string, unknown>;
}) {
  const data = resultObj as unknown as TradeTicketData;
  const { allActions, openPopup, updateActionStatus, stageAction, now } = useStagedActions();

  // Find stored action item in Dexie
  const storedTrade = useMemo(() => {
    return data.ticketId ? allActions.find((t) => t.id === data.ticketId) || null : null;
  }, [data.ticketId, allActions]);

  // Auto-stage to Dexie without forcing popup if already closed
  useEffect(() => {
    if (data.ticketId && data.ticketToken && data.symbol) {
      void stageAction(
        {
          id: data.ticketId,
          actionType: 'order',
          ticketToken: data.ticketToken,
          symbol: data.symbol,
          category: data.category || 'USDT-FUTURES',
          side: data.side || 'buy',
          orderType: data.orderType || 'limit',
          size: data.size || 0,
          price: data.price,
          tradeSide: data.tradeSide,
          leverage: data.leverage,
          notionalUsdt: data.notionalUsdt,
          initialMarginUsdt: data.initialMarginUsdt,
          estimatedLiquidation: data.estimatedLiquidation,
          stopLossPrice: data.stopLossPrice,
          takeProfitPrice: data.takeProfitPrice,
          riskRewardRatio: data.riskRewardRatio,
          rationale: data.rationale,
        },
        false
      );
    }
  }, [
    data.ticketId,
    data.ticketToken,
    data.symbol,
    data.category,
    data.side,
    data.orderType,
    data.size,
    data.price,
    data.tradeSide,
    data.leverage,
    data.notionalUsdt,
    data.initialMarginUsdt,
    data.estimatedLiquidation,
    data.stopLossPrice,
    data.takeProfitPrice,
    data.riskRewardRatio,
    data.rationale,
    stageAction,
  ]);

  const remainingSeconds = storedTrade ? Math.max(0, Math.floor((storedTrade.expiresAt - now) / 1000)) : 300;


  const {
    executionState,
    responseMessage,
    confirmOrder,
  } = useExecuteTrade({
    activeTrade: storedTrade,
    remainingSeconds,
    updateActionStatus,
    onClose: () => {},
  });

  const isBuy = data.side === 'buy';

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-theme-bg-surface border border-theme-border-subtle text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-theme-border-subtle/50 pb-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="size-4 text-theme-brand-primary" />
          <span className="font-semibold text-theme-text-primary uppercase tracking-wide">
            Trade Ticket #{data.ticketId?.substring(0, 12) || 'UTA-v3'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <SideBadge side={data.side} />
          <CategoryBadge category={data.category?.toUpperCase() || 'FUTURES'} />
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <MetricGrid columns={4}>
        <MetricTile label="Asset" value={data.symbol} />
        <MetricTile label="Order Type" value={data.orderType} className="capitalize" />
        <MetricTile label="Size" value={data.size} />
        <MetricTile label="Target Price" value={formatUSD(data.price, 'MARKET')} valueColor="text-theme-brand-primary" />
      </MetricGrid>

      {/* Sizing & Risk Details */}
      <MetricGrid columns={3} className="bg-theme-bg-elevated/20 p-2 rounded border border-theme-border-subtle/40">
        <MetricTile label="Notional" value={formatUSD(data.notionalUsdt)} className="bg-transparent p-0" />
        <MetricTile label={`Est. Margin (${data.leverage || 1}x)`} value={formatUSD(data.initialMarginUsdt)} className="bg-transparent p-0" />
        <MetricTile
          label="Est. Liquidation"
          value={data.estimatedLiquidation ? formatUSD(data.estimatedLiquidation) : 'N/A'}
          valueColor="text-theme-status-warning"
          className="bg-transparent p-0"
        />
      </MetricGrid>

      {/* TP / SL / Risk:Reward */}
      {(data.stopLossPrice || data.takeProfitPrice) && (
        <div className="flex items-center justify-between px-2 py-1.5 rounded bg-theme-bg-elevated/40 text-2xs font-mono">
          {data.stopLossPrice && (
            <div className="flex items-center gap-1 text-theme-status-danger">
              <ArrowDownRight className="size-3" />
              <span>SL: {formatUSD(data.stopLossPrice)}</span>
            </div>
          )}
          {data.takeProfitPrice && (
            <div className="flex items-center gap-1 text-theme-status-success">
              <ArrowUpRight className="size-3" />
              <span>TP: {formatUSD(data.takeProfitPrice)}</span>
            </div>
          )}
          {data.riskRewardRatio && (
            <span className="text-theme-brand-accent">R:R {data.riskRewardRatio}</span>
          )}
        </div>
      )}

      {/* Rationale */}
      {data.rationale && (
        <p className="text-2xs text-theme-text-secondary italic">
          &ldquo;{data.rationale}&rdquo;
        </p>
      )}

      {/* Action CTA / Confirmation State */}
      <div className="pt-1 flex flex-col gap-1.5">
        {executionState === 'idle' && (
          <div className="flex flex-col sm:flex-row items-center gap-1.5">
            <button
              type="button"
              onClick={() => data.ticketId && openPopup(data.ticketId)}
              className="w-full sm:flex-1 py-2 px-3 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-all bg-theme-brand-primary text-theme-bg-overlay hover:brightness-105 shadow-sm cursor-pointer"
            >
              <ExternalLink className="size-3.5" />
              <span>Review in Confirmation Popup</span>
            </button>

            <button
              type="button"
              onClick={confirmOrder}
              className={`w-full sm:w-auto py-2 px-3 rounded font-medium text-xs flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                isBuy
                  ? 'bg-theme-status-success/15 hover:bg-theme-status-success/25 text-theme-status-success border-theme-status-success/30'
                  : 'bg-theme-status-danger/15 hover:bg-theme-status-danger/25 text-theme-status-danger border-theme-status-danger/30'
              }`}
            >
              <ShieldCheck className="size-3.5" />
              <span>Quick {isBuy ? 'Buy' : 'Sell'}</span>
            </button>
          </div>
        )}

        {executionState === 'executing' && (
          <div className="flex items-center justify-center gap-2 py-2 px-3 rounded bg-theme-bg-elevated text-theme-text-muted text-xs font-mono">
            <Loader2 className="size-3.5 animate-spin text-theme-brand-primary" />
            <span>Signing & Transmitting Order to Bitget v3...</span>
          </div>
        )}

        {executionState === 'success' && (
          <div className="flex items-center justify-between py-1.5 px-2.5 rounded bg-theme-status-success/15 border border-theme-status-success/30 text-theme-status-success text-xs font-mono font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              <span>{responseMessage || 'Order Submitted Successfully'}</span>
            </div>
            <span className="text-2xs uppercase opacity-80">v3 Live</span>
          </div>
        )}

        {executionState === 'error' && (
          <div className="flex flex-col gap-1.5 p-2 rounded bg-theme-status-danger/15 border border-theme-status-danger/30 text-theme-status-danger text-xs">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="size-3.5 shrink-0" />
              <span className="truncate">{responseMessage || 'Order Execution Failed'}</span>
            </div>
            <button
              type="button"
              onClick={confirmOrder}
              className="self-end px-2 py-0.5 rounded bg-theme-status-danger text-white text-2xs hover:bg-theme-status-danger/80 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
