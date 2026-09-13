'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
} from 'lucide-react';
import type { StagedTradeItem } from '@/hooks/chat';
import { EASING_ARCHITECTURAL } from '@/constants/animation';

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
  const isExecuting = executionState === 'executing';
  const isExpired = remainingSeconds <= 0 && executionState !== 'success';

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

  const isCloseLong = activeTrade.closeSide === 'sell' || activeTrade.side === 'sell';
  const exitPercent = activeTrade.sizePercent || 100;

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
              <span className="size-2 rounded-full bg-rose-500" />
              <span className="font-semibold text-xs text-theme-text-primary tracking-tight">
                Confirm Position Exit ({exitPercent}%)
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

          {/* Status alerts */}
          {executionState === 'error' && (
            <div className="mx-5 mb-3 flex items-center gap-1.5 text-2xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">
              <AlertCircle className="size-3.5 shrink-0" />
              <span className="truncate">{responseMessage || 'Exit execution failed'}</span>
            </div>
          )}

          {isExpired && (
            <div className="mx-5 mb-3 text-2xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">
              Action ticket expired. Please request a new exit action.
            </div>
          )}

          {/* Primary Action Button */}
          <div className="p-5 pt-1">
            {executionState === 'idle' && (
              <button
                type="button"
                disabled={isExpired}
                onClick={onConfirm}
                className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs transition-all active:scale-[0.99] select-none flex items-center justify-center gap-1.5 ${
                  isExpired
                    ? 'opacity-30 cursor-not-allowed bg-theme-bg-elevated text-theme-text-muted'
                    : 'bg-rose-500 hover:bg-rose-400 text-white cursor-pointer'
                }`}
              >
                <LogOut className="size-3.5" />
                <span>Confirm Market Exit</span>
              </button>
            )}

            {executionState === 'executing' && (
              <div className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-theme-bg-elevated text-theme-text-muted text-xs font-mono">
                <Loader2 className="size-3.5 animate-spin text-theme-text-primary" />
                <span>Submitting position exit to Bitget...</span>
              </div>
            )}

            {executionState === 'error' && (
              <button
                type="button"
                onClick={onConfirm}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-rose-500 hover:bg-rose-400 text-white transition-colors cursor-pointer"
              >
                Retry Market Exit
              </button>
            )}

            {executionState === 'success' && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="size-3.5" />
                <span>{responseMessage || 'Position exit submitted successfully'}</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});
