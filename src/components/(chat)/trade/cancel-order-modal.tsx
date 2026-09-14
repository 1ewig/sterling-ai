'use client';

import React from 'react';
import { Ban } from 'lucide-react';
import type { StagedTradeItem } from '@/hooks/chat';
import { TradeModalShell } from './trade-modal-shell';

/* -------------------------------------------------------------------------- */
/*                     Reusable Cancel Order Modal                            */
/* -------------------------------------------------------------------------- */

export interface CancelOrderModalProps {
  isOpen: boolean;
  activeTrade: StagedTradeItem | null;
  remainingSeconds: number;
  executionState: 'idle' | 'executing' | 'success' | 'error';
  responseMessage?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const CancelOrderModal = React.memo(function CancelOrderModal({
  isOpen,
  activeTrade,
  remainingSeconds,
  executionState,
  responseMessage,
  onClose,
  onConfirm,
}: CancelOrderModalProps) {
  if (!isOpen || !activeTrade) return null;

  const targetOrderLabel = activeTrade.cancelAll
    ? 'All Working Orders'
    : activeTrade.orderId || activeTrade.clientOid || '—';

  return (
    <TradeModalShell
      isOpen={isOpen}
      activeTrade={activeTrade}
      remainingSeconds={remainingSeconds}
      executionState={executionState}
      responseMessage={responseMessage}
      title="Confirm Cancellation"
      indicatorColor="bg-amber-500"
      confirmLabel={activeTrade.cancelAll ? 'Confirm Cancel All Orders' : 'Confirm Order Cancellation'}
      confirmIcon={<Ban className="size-3.5" />}
      confirmButtonClass="bg-amber-500 hover:bg-amber-400 text-black cursor-pointer"
      executingLabel="Cancelling on Bitget..."
      retryLabel="Retry Cancellation"
      successDefaultMessage="Order cancelled successfully"
      expiredMessage="Action ticket expired. Please request a new cancellation action."
      onClose={onClose}
      onConfirm={onConfirm}
    >
      {/* Central Target Info */}
      <div className="px-5 py-2 flex items-baseline justify-between border-b border-theme-border-subtle/40 pb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-base text-theme-text-primary">
              {activeTrade.symbol}
            </span>
            <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-theme-bg-elevated text-theme-text-secondary border border-theme-border-subtle">
              {activeTrade.category.toUpperCase()}
            </span>
          </div>
          <span className="text-2xs text-theme-text-muted uppercase font-mono">
            {activeTrade.cancelAll ? 'ALL OPEN ORDERS' : 'SINGLE ORDER'}
          </span>
        </div>

        <div className="text-right">
          <span className="text-2xs font-mono text-theme-status-warning font-semibold">
            {activeTrade.cancelAll
              ? 'Symbol-wide'
              : `Order #${(activeTrade.orderId || activeTrade.clientOid || '').substring(0, 8)}`}
          </span>
        </div>
      </div>

      {/* Details Ladder */}
      <div className="px-5 py-3 space-y-2 text-xs font-mono">
        <div className="flex justify-between items-center text-theme-text-secondary">
          <span className="text-2xs text-theme-text-muted">Target Order</span>
          <span className="font-medium text-theme-text-primary truncate max-w-[180px]">
            {targetOrderLabel}
          </span>
        </div>

        <div className="flex justify-between items-center text-theme-text-secondary">
          <span className="text-2xs text-theme-text-muted">Action Type</span>
          <span className="text-theme-status-warning font-semibold">
            {activeTrade.cancelAll ? 'Cancel All Open' : 'Single Order Cancel'}
          </span>
        </div>

        <div className="flex justify-between items-center text-theme-text-secondary">
          <span className="text-2xs text-theme-text-muted">Scope</span>
          <span className="text-theme-text-secondary">Immediate Cancel</span>
        </div>

        {activeTrade.rationale && (
          <div className="pt-1 text-2xs text-theme-text-secondary italic font-sans border-t border-theme-border-subtle/30 mt-2">
            {activeTrade.rationale}
          </div>
        )}
      </div>
    </TradeModalShell>
  );
});

