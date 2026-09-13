'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, ShieldCheck, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { useStagedActions } from '@/hooks/chat';

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
  const { allActions, openPopup, updateActionStatus, stageAction } = useStagedActions();

  // Synchronize with Dexie staged status
  const storedTrade = data.ticketId ? allActions.find((t) => t.id === data.ticketId) : undefined;

  const [localExecutionState, setLocalExecutionState] = useState<'idle' | 'executing' | 'success' | 'error'>('idle');
  const [localResponseMessage, setLocalResponseMessage] = useState<string | null>(null);
  const [prevTicketId, setPrevTicketId] = useState<string | undefined>(data.ticketId);

  // Reset local state whenever the ticketId changes (render-time pattern)
  if (data.ticketId !== prevTicketId) {
    setPrevTicketId(data.ticketId);
    setLocalExecutionState('idle');
    setLocalResponseMessage(null);
  }

  const executionState =
    storedTrade?.status === 'executed'
      ? 'success'
      : storedTrade?.status === 'executing'
      ? 'executing'
      : localExecutionState;

  const responseMessage =
    storedTrade?.status === 'executed' && (storedTrade.orderIdResult || storedTrade.orderId)
      ? `Order #${(storedTrade.orderIdResult || storedTrade.orderId || '').substring(0, 10)} Filled / Placed`
      : localResponseMessage;

  const isBuy = data.side === 'buy';

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

  const handleConfirmOrder = async () => {
    setLocalExecutionState('executing');
    setLocalResponseMessage(null);
    if (data.ticketId) {
      void updateActionStatus(data.ticketId, { status: 'executing' });
    }

    try {
      const res = await fetch('/api/trade/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketToken: data.ticketToken,
          symbol: data.symbol,
          category: data.category,
          side: data.side,
          orderType: data.orderType,
          size: data.size,
          price: data.price,
          tradeSide: data.tradeSide,
          leverage: data.leverage,
          stopLossPrice: data.stopLossPrice,
          takeProfitPrice: data.takeProfitPrice,
        }),
      });

      const json = (await res.json()) as { success?: boolean; orderId?: string; error?: string; message?: string };

      if (json.success) {
        setLocalExecutionState('success');
        setLocalResponseMessage(json.orderId ? `Order #${json.orderId.substring(0, 10)} Filled / Placed` : 'Order executed successfully');
        if (data.ticketId) {
          void updateActionStatus(data.ticketId, { status: 'executed', orderIdResult: json.orderId });
        }
      } else {
        const errMsg = json.error || 'Order execution rejected';
        setLocalExecutionState('error');
        setLocalResponseMessage(errMsg);
        if (data.ticketId) {
          void updateActionStatus(data.ticketId, { status: 'staged', executionError: errMsg });
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Network error';
      setLocalExecutionState('error');
      setLocalResponseMessage(errMsg);
      if (data.ticketId) {
        void updateActionStatus(data.ticketId, { status: 'staged', executionError: errMsg });
      }
    }
  };

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
          <span
            className={`px-1.5 py-0.5 rounded font-mono font-bold text-2xs uppercase ${
              isBuy
                ? 'bg-theme-status-success/15 text-theme-status-success border border-theme-status-success/30'
                : 'bg-theme-status-danger/15 text-theme-status-danger border border-theme-status-danger/30'
            }`}
          >
            {isBuy ? 'BUY / LONG' : 'SELL / SHORT'}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-theme-bg-elevated text-theme-text-muted text-2xs font-mono">
            {data.category?.toUpperCase() || 'FUTURES'}
          </span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <div className="flex flex-col bg-theme-bg-elevated/40 p-2 rounded">
          <span className="text-theme-text-muted text-2xs uppercase">Asset</span>
          <span className="font-mono font-bold text-theme-text-primary truncate">{data.symbol}</span>
        </div>
        <div className="flex flex-col bg-theme-bg-elevated/40 p-2 rounded">
          <span className="text-theme-text-muted text-2xs uppercase">Order Type</span>
          <span className="font-mono font-medium text-theme-text-primary capitalize">{data.orderType}</span>
        </div>
        <div className="flex flex-col bg-theme-bg-elevated/40 p-2 rounded">
          <span className="text-theme-text-muted text-2xs uppercase">Size</span>
          <span className="font-mono font-bold text-theme-text-primary">{data.size}</span>
        </div>
        <div className="flex flex-col bg-theme-bg-elevated/40 p-2 rounded">
          <span className="text-theme-text-muted text-2xs uppercase">Target Price</span>
          <span className="font-mono font-bold text-theme-brand-primary">
            ${data.price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Sizing & Risk Details */}
      <div className="grid grid-cols-3 gap-2 bg-theme-bg-elevated/20 p-2 rounded border border-theme-border-subtle/40">
        <div className="flex flex-col">
          <span className="text-theme-text-muted text-2xs">Notional</span>
          <span className="font-mono text-theme-text-primary">${data.notionalUsdt?.toFixed(2)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-theme-text-muted text-2xs">Est. Margin ({data.leverage}x)</span>
          <span className="font-mono text-theme-text-primary">${data.initialMarginUsdt?.toFixed(2)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-theme-text-muted text-2xs">Est. Liquidation</span>
          <span className="font-mono text-theme-status-warning">
            {data.estimatedLiquidation ? `$${data.estimatedLiquidation.toFixed(2)}` : 'N/A'}
          </span>
        </div>
      </div>

      {/* TP / SL / Risk:Reward */}
      {(data.stopLossPrice || data.takeProfitPrice) && (
        <div className="flex items-center justify-between px-2 py-1.5 rounded bg-theme-bg-elevated/40 text-2xs font-mono">
          {data.stopLossPrice && (
            <div className="flex items-center gap-1 text-theme-status-danger">
              <ArrowDownRight className="size-3" />
              <span>SL: ${data.stopLossPrice}</span>
            </div>
          )}
          {data.takeProfitPrice && (
            <div className="flex items-center gap-1 text-theme-status-success">
              <ArrowUpRight className="size-3" />
              <span>TP: ${data.takeProfitPrice}</span>
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
              onClick={handleConfirmOrder}
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
              onClick={handleConfirmOrder}
              className="self-end px-2 py-0.5 rounded bg-theme-status-danger text-white text-2xs hover:bg-theme-status-danger/80"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
