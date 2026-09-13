'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useStagedActions } from '@/hooks/chat';

interface OrderActionData {
  actionId?: string;
  actionToken?: string;
  action?: 'cancel_order' | 'cancel_symbol' | 'close_position';
  symbol?: string;
  category?: string;
  orderId?: string;
  clientOid?: string;
  side?: 'buy' | 'sell';
  closeSide?: 'buy' | 'sell';
  closeSize?: string;
  totalPositionSize?: number;
  sizePercent?: number;
  unrealizedPnl?: string;
  markPrice?: string;
  cancelAll?: boolean;
  summary?: string;
  rationale?: string;
  actionableGuidance?: string;
}

export const OrderActionCard = React.memo(function OrderActionCard({
  resultObj,
}: {
  resultObj: Record<string, unknown>;
}) {
  const data = resultObj as unknown as OrderActionData;
  const { allActions, updateActionStatus, stageAction } = useStagedActions();

  const [localExecutionState, setLocalExecutionState] = useState<'idle' | 'executing' | 'success' | 'error'>('idle');
  const [localResponseMessage, setLocalResponseMessage] = useState<string | null>(null);

  const stagedItem = data.actionId ? allActions.find((t) => t.id === data.actionId) : undefined;
  const isExecutedInStore = stagedItem?.status === 'executed';
  const effectiveState =
    isExecutedInStore
      ? 'success'
      : stagedItem?.status === 'executing'
      ? 'executing'
      : localExecutionState;

  const responseMessage =
    isExecutedInStore
      ? localResponseMessage || 'Action executed successfully.'
      : localResponseMessage || stagedItem?.executionError || null;

  const isClose = data.action === 'close_position';
  const isCancel = data.action === 'cancel_order' || data.action === 'cancel_symbol';

  // Auto-stage action ticket to Dexie without forcing popup if already closed
  useEffect(() => {
    if (data.actionId && data.actionToken && data.symbol) {
      void stageAction(
        {
          id: data.actionId,
          actionType: isClose ? 'close' : 'cancel',
          actionToken: data.actionToken,
          action: data.action || (isClose ? 'close_position' : 'cancel_order'),
          symbol: data.symbol,
          category: data.category || 'USDT-FUTURES',
          orderId: data.orderId,
          clientOid: data.clientOid,
          cancelAll: data.cancelAll,
          closeSide: data.closeSide,
          closeSize: data.closeSize,
          totalPositionSize: data.totalPositionSize,
          sizePercent: data.sizePercent,
          unrealizedPnl: data.unrealizedPnl,
          markPrice: data.markPrice,
          summary: data.summary,
          rationale: data.rationale,
          actionableGuidance: data.actionableGuidance,
        },
        false
      );
    }
  }, [
    data.actionId,
    data.actionToken,
    data.symbol,
    data.action,
    data.category,
    data.orderId,
    data.clientOid,
    data.cancelAll,
    data.closeSide,
    data.closeSize,
    data.totalPositionSize,
    data.sizePercent,
    data.unrealizedPnl,
    data.markPrice,
    data.summary,
    data.rationale,
    data.actionableGuidance,
    isClose,
    stageAction,
  ]);

  const handleConfirmAction = async () => {
    setLocalExecutionState('executing');
    setLocalResponseMessage(null);
    if (data.actionId) {
      void updateActionStatus(data.actionId, { status: 'executing' });
    }

    try {
      const res = await fetch('/api/trade/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionToken: data.actionToken,
          action: data.action,
          symbol: data.symbol,
          category: data.category,
          orderId: data.orderId,
          clientOid: data.clientOid,
          side: data.closeSide || data.side,
          size: data.closeSize,
        }),
      });

      const json = (await res.json()) as { success?: boolean; message?: string; error?: string };

      if (json.success) {
        setLocalExecutionState('success');
        setLocalResponseMessage(json.message || 'Action executed successfully.');
        if (data.actionId) {
          void updateActionStatus(data.actionId, { status: 'executed' });
        }
      } else {
        setLocalExecutionState('error');
        setLocalResponseMessage(json.error || 'Action execution rejected.');
        if (data.actionId) {
          void updateActionStatus(data.actionId, { status: 'staged', executionError: json.error });
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Network error';
      setLocalExecutionState('error');
      setLocalResponseMessage(errMsg);
      if (data.actionId) {
        void updateActionStatus(data.actionId, { status: 'staged', executionError: errMsg });
      }
    }
  };

  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-lg bg-theme-bg-surface border border-theme-border-subtle text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-theme-border-subtle/50 pb-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className={`size-4 ${isClose ? 'text-theme-status-warning' : 'text-theme-brand-primary'}`} />
          <span className="font-semibold text-theme-text-primary uppercase tracking-wide">
            {isClose ? 'Position Exit Ticket' : 'Order Cancellation Ticket'}
          </span>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-theme-bg-elevated text-theme-text-muted text-2xs font-mono">
          {data.category?.toUpperCase() || 'FUTURES'}
        </span>
      </div>

      {/* Details Box */}
      <div className="p-2 rounded bg-theme-bg-elevated/40 border border-theme-border-subtle/40 flex flex-col gap-1.5 font-mono text-xs">
        <div className="flex justify-between items-center">
          <span className="text-theme-text-muted">Target Pair:</span>
          <span className="font-bold text-theme-text-primary">{data.symbol}</span>
        </div>

        {isClose && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-theme-text-muted">Exit Direction:</span>
              <span className={`font-bold ${data.closeSide === 'buy' ? 'text-theme-status-success' : 'text-theme-status-danger'}`}>
                {data.closeSide?.toUpperCase()} (Reduce-Only)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-theme-text-muted">Close Ratio / Size:</span>
              <span className="text-theme-text-primary">
                {data.sizePercent}% ({data.closeSize || 'ALL'} contracts)
              </span>
            </div>
            {data.unrealizedPnl && (
              <div className="flex justify-between items-center">
                <span className="text-theme-text-muted">Unrealized PnL:</span>
                <span className={parseFloat(data.unrealizedPnl) >= 0 ? 'text-theme-status-success' : 'text-theme-status-danger'}>
                  ${data.unrealizedPnl}
                </span>
              </div>
            )}
          </>
        )}

        {isCancel && (
          <div className="flex justify-between items-center">
            <span className="text-theme-text-muted">Scope:</span>
            <span className="text-theme-text-primary">
              {data.cancelAll ? 'ALL Open Orders' : `Order #${data.orderId || data.clientOid}`}
            </span>
          </div>
        )}

        {data.rationale && (
          <div className="pt-1 border-t border-theme-border-subtle/30 text-2xs text-theme-text-secondary font-sans italic">
            Rationale: {data.rationale}
          </div>
        )}
      </div>

      {/* Action Execution Button */}
      {effectiveState === 'idle' && (
        <button
          type="button"
          onClick={handleConfirmAction}
          className={`w-full py-2 px-3 rounded font-medium text-xs transition-colors flex items-center justify-center gap-1.5 ${
            isClose
              ? 'bg-theme-status-danger/90 hover:bg-theme-status-danger text-theme-text-primary'
              : 'bg-theme-brand-primary hover:bg-theme-brand-accent text-theme-bg-base font-semibold'
          }`}
        >
          Confirm & Execute {isClose ? 'Market Exit' : 'Cancellation'}
        </button>
      )}

      {effectiveState === 'executing' && (
        <div className="py-2 flex items-center justify-center gap-1.5 text-theme-brand-primary font-mono text-2xs">
          <Loader2 className="size-3.5 animate-spin" />
          Transmitting to Bitget v3 UTA...
        </div>
      )}

      {effectiveState === 'success' && (
        <div className="p-2 rounded bg-theme-status-success/15 border border-theme-status-success/30 flex items-center gap-1.5 text-theme-status-success text-2xs">
          <CheckCircle2 className="size-3.5 flex-shrink-0" />
          <span>{responseMessage || 'Action executed successfully.'}</span>
        </div>
      )}

      {effectiveState === 'error' && (
        <div className="flex flex-col gap-2">
          <div className="p-2 rounded bg-theme-status-danger/15 border border-theme-status-danger/30 flex items-center gap-1.5 text-theme-status-danger text-2xs">
            <AlertCircle className="size-3.5 flex-shrink-0" />
            <span>{responseMessage || 'Action failed.'}</span>
          </div>
          <button
            type="button"
            onClick={handleConfirmAction}
            className="w-full py-1.5 px-3 rounded font-medium text-xs bg-theme-bg-elevated hover:bg-theme-bg-elevated/80 text-theme-text-primary transition-colors cursor-pointer"
          >
            Retry Execution
          </button>
        </div>
      )}
    </div>
  );
});
