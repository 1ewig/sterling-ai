'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
import type { StagedTradeItem } from '@/hooks/chat';
import { TradeModalShell } from './trade-modal-shell';

/* -------------------------------------------------------------------------- */
/*                     Reusable Close Position Modal                          */
/* -------------------------------------------------------------------------- */

export interface ClosePositionModalProps {
  isOpen: boolean;
  activeTrade: StagedTradeItem | null;
  remainingSeconds: number;
  executionState: 'idle' | 'executing' | 'success' | 'error';
  responseMessage?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const ClosePositionModal = React.memo(function ClosePositionModal({
  isOpen,
  activeTrade,
  remainingSeconds,
  executionState,
  responseMessage,
  onClose,
  onConfirm,
}: ClosePositionModalProps) {
  if (!isOpen || !activeTrade) return null;

  const isCloseLong = activeTrade.closeSide === 'sell' || activeTrade.side === 'sell';
  const exitPercent = activeTrade.sizePercent || 100;

  return (
    <TradeModalShell
      isOpen={isOpen}
      activeTrade={activeTrade}
      remainingSeconds={remainingSeconds}
      executionState={executionState}
      responseMessage={responseMessage}
      title={`Confirm Position Exit (${exitPercent}%)`}
      indicatorColor="bg-rose-500"
      confirmLabel="Confirm Market Exit"
      confirmIcon={<LogOut className="size-3.5" />}
      confirmButtonClass="bg-rose-500 hover:bg-rose-400 text-white cursor-pointer"
      executingLabel="Submitting position exit to Bitget..."
      retryLabel="Retry Market Exit"
      successDefaultMessage="Position exit submitted successfully"
      expiredMessage="Action ticket expired. Please request a new exit action."
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
            {isCloseLong ? 'CLOSE LONG POSITION' : 'CLOSE SHORT POSITION'}
          </span>
        </div>

        <div className="text-right">
          <div className="font-mono font-semibold text-sm text-theme-text-primary">
            {activeTrade.closeSize ? `${activeTrade.closeSize} Units` : `${exitPercent}% Exit`}
          </div>
          <span className="text-2xs font-mono text-theme-text-muted">
            Mark: {activeTrade.markPrice ? `$${activeTrade.markPrice}` : 'Market'}
          </span>
        </div>
      </div>

      {/* Details Ladder */}
      <div className="px-5 py-3 space-y-2 text-xs font-mono">
        <div className="flex justify-between items-center text-theme-text-secondary">
          <span className="text-2xs text-theme-text-muted">Exit Portion</span>
          <span className="font-medium text-theme-text-primary">
            {exitPercent}% of Position
          </span>
        </div>

        {activeTrade.closeSize && (
          <div className="flex justify-between items-center text-theme-text-secondary">
            <span className="text-2xs text-theme-text-muted">Close Size</span>
            <span className="font-medium text-theme-text-primary">
              {activeTrade.closeSize} contracts
            </span>
          </div>
        )}

        {activeTrade.unrealizedPnl && (
          <div className="flex justify-between items-center text-theme-text-secondary">
            <span className="text-2xs text-theme-text-muted">Unrealized PnL</span>
            <span
              className={
                parseFloat(activeTrade.unrealizedPnl) >= 0
                  ? 'text-theme-status-success font-semibold'
                  : 'text-theme-status-danger font-semibold'
              }
            >
              ${activeTrade.unrealizedPnl}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center text-theme-text-secondary">
          <span className="text-2xs text-theme-text-muted">Execution Type</span>
          <span className="text-theme-text-secondary">Market Immediate</span>
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

