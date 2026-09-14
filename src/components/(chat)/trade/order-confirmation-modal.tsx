'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { StagedTradeItem } from '@/hooks/chat';
import { formatUSD } from '@/lib/bitget/formatters';
import { TradeModalShell } from './trade-modal-shell';

/* -------------------------------------------------------------------------- */
/*                     Reusable Order Confirmation Modal                      */
/* -------------------------------------------------------------------------- */

export interface OrderConfirmationModalProps {
  isOpen: boolean;
  activeTrade: StagedTradeItem | null;
  remainingSeconds: number;
  executionState: 'idle' | 'executing' | 'success' | 'error';
  responseMessage?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const OrderConfirmationModal = React.memo(function OrderConfirmationModal({
  isOpen,
  activeTrade,
  remainingSeconds,
  executionState,
  responseMessage,
  onClose,
  onConfirm,
}: OrderConfirmationModalProps) {
  if (!isOpen || !activeTrade) return null;

  const isBuy = activeTrade.side === 'buy';

  return (
    <TradeModalShell
      isOpen={isOpen}
      activeTrade={activeTrade}
      remainingSeconds={remainingSeconds}
      executionState={executionState}
      responseMessage={responseMessage}
      title={`Confirm ${isBuy ? 'Buy' : 'Sell'} Order`}
      indicatorColor={isBuy ? 'bg-emerald-500' : 'bg-rose-500'}
      confirmLabel={`Confirm ${isBuy ? 'Buy' : 'Sell'} Order`}
      confirmButtonClass={
        isBuy
          ? 'bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer'
          : 'bg-rose-500 hover:bg-rose-400 text-white cursor-pointer'
      }
      executingLabel="Transmitting order to Bitget..."
      retryLabel="Retry Order Execution"
      successDefaultMessage="Order executed successfully"
      expiredMessage="Order expired. Restage for an updated ticket token."
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
              {activeTrade.leverage ? `${activeTrade.leverage}x` : '1x'}
            </span>
          </div>
          <span className="text-2xs text-theme-text-muted uppercase font-mono">
            {activeTrade.category} · {activeTrade.orderType}
          </span>
        </div>

        <div className="text-right">
          <div className="font-mono font-semibold text-sm text-theme-text-primary">
            {formatUSD(activeTrade.price, 'MARKET')}
          </div>
          <span className="text-2xs font-mono text-theme-text-muted">
            {activeTrade.size} Units
          </span>
        </div>
      </div>

      {/* Details Ladder */}
      <div className="px-5 py-3 space-y-2 text-xs font-mono">
        <div className="flex justify-between items-center text-theme-text-secondary">
          <span className="text-2xs text-theme-text-muted">Notional Value</span>
          <span>{formatUSD(activeTrade.notionalUsdt)}</span>
        </div>

        <div className="flex justify-between items-center text-theme-text-secondary">
          <span className="text-2xs text-theme-text-muted">Required Margin</span>
          <span className="font-medium text-theme-text-primary">
            {formatUSD(activeTrade.initialMarginUsdt)}
          </span>
        </div>

        {activeTrade.estimatedLiquidation && activeTrade.estimatedLiquidation > 0 && (
          <div className="flex justify-between items-center text-theme-text-secondary">
            <span className="text-2xs text-theme-text-muted">Est. Liquidation</span>
            <span className="text-amber-400">
              {formatUSD(activeTrade.estimatedLiquidation)}
            </span>
          </div>
        )}

        {activeTrade.riskRewardRatio && (
          <div className="flex justify-between items-center text-theme-text-secondary">
            <span className="text-2xs text-theme-text-muted">Risk / Reward</span>
            <span className="text-theme-brand-primary">{activeTrade.riskRewardRatio}</span>
          </div>
        )}
      </div>

      {/* Risk bounds: TP/SL badge */}
      {(activeTrade.stopLossPrice || activeTrade.takeProfitPrice) && (
        <div className="mx-5 mb-2 px-3 py-1.5 rounded-lg bg-theme-bg-elevated/40 border border-theme-border-subtle/40 flex items-center justify-between text-2xs font-mono">
          <div className="flex items-center gap-1 text-rose-400">
            <ArrowDownRight className="size-3" />
            <span>SL {formatUSD(activeTrade.stopLossPrice)}</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <ArrowUpRight className="size-3" />
            <span>TP {formatUSD(activeTrade.takeProfitPrice)}</span>
          </div>
        </div>
      )}
    </TradeModalShell>
  );
});

