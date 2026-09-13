'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import type { StagedTradeItem } from '@/hooks/chat';
import { EASING_ARCHITECTURAL } from '@/constants/animation';

/* -------------------------------------------------------------------------- */
/*                               Helper Formatter                             */
/* -------------------------------------------------------------------------- */

function formatUSD(val?: number | null, fallback = '—'): string {
  if (val === undefined || val === null || isNaN(val)) return fallback;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: val < 1 && val > 0 ? 4 : 2,
    maximumFractionDigits: val < 1 && val > 0 ? 6 : 2,
  }).format(val);
}

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
  const isExecuting = executionState === 'executing';
  const isExpired = remainingSeconds <= 0 && executionState !== 'success';
  const isBuy = activeTrade?.side === 'buy';

  // Body scroll lock
  useEffect(() => {
    if (!isOpen || !activeTrade) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen, activeTrade]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExecuting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExecuting, onClose]);

  if (!isOpen || !activeTrade) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => !isExecuting && onClose()}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          aria-hidden="true"
        />

        {/* Surface */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 4 }}
          transition={{ duration: 0.18, ease: EASING_ARCHITECTURAL }}
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-sm rounded-2xl bg-theme-bg-surface border border-theme-border-subtle shadow-2xl overflow-hidden flex flex-col z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${isBuy ? 'bg-emerald-500' : 'bg-rose-500'}`}
              />
              <span className="font-semibold text-xs text-theme-text-primary tracking-tight">
                Confirm {isBuy ? 'Buy' : 'Sell'} Order
              </span>
              <span className="font-mono text-2xs text-theme-text-muted">
                #{activeTrade.id.substring(0, 6)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1 font-mono text-2xs px-2 py-0.5 rounded-full border transition-colors ${
                  isExpired
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                    : remainingSeconds <= 60
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : 'text-theme-text-muted'
                }`}
              >
                <Clock className="size-3" />
                <span>{isExpired ? 'Expired' : timeFormatted}</span>
              </div>

              <button
                type="button"
                disabled={isExecuting}
                onClick={onClose}
                className="p-1 -mr-1 rounded-md text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-bg-elevated transition-colors disabled:opacity-30 cursor-pointer"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

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

          {/* Status alerts */}
          {executionState === 'error' && (
            <div className="mx-5 mb-3 flex items-center gap-1.5 text-2xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">
              <AlertCircle className="size-3.5 shrink-0" />
              <span className="truncate">{responseMessage || 'Order execution failed'}</span>
            </div>
          )}

          {isExpired && (
            <div className="mx-5 mb-3 text-2xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">
              Order expired. Restage for an updated ticket token.
            </div>
          )}

          {/* Primary Action Button */}
          <div className="p-5 pt-1">
            {executionState === 'idle' && (
              <button
                type="button"
                disabled={isExpired}
                onClick={onConfirm}
                className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs transition-all active:scale-[0.99] select-none ${
                  isExpired
                    ? 'opacity-30 cursor-not-allowed bg-theme-bg-elevated text-theme-text-muted'
                    : isBuy
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer'
                      : 'bg-rose-500 hover:bg-rose-400 text-white cursor-pointer'
                }`}
              >
                Confirm {isBuy ? 'Buy' : 'Sell'} Order
              </button>
            )}

            {executionState === 'executing' && (
              <div className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-theme-bg-elevated text-theme-text-muted text-xs font-mono">
                <Loader2 className="size-3.5 animate-spin text-theme-text-primary" />
                <span>Transmitting order to Bitget...</span>
              </div>
            )}

            {executionState === 'error' && (
              <button
                type="button"
                onClick={onConfirm}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-rose-500 hover:bg-rose-400 text-white transition-colors cursor-pointer"
              >
                Retry Order Execution
              </button>
            )}

            {executionState === 'success' && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="size-3.5" />
                <span>{responseMessage || 'Order executed successfully'}</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});
