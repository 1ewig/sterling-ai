'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { useStagedTradesStore, type StagedTradeItem } from '@/stores/staged-trades-store';
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
/*                       Dialog Content (Keyed by Trade ID)                   */
/* -------------------------------------------------------------------------- */

interface TradeConfirmationDialogContentProps {
  activeTrade: StagedTradeItem;
  onClose: () => void;
}

const TradeConfirmationDialogContent = React.memo(function TradeConfirmationDialogContent({
  activeTrade,
  onClose,
}: TradeConfirmationDialogContentProps) {
  const updateTradeStatus = useStagedTradesStore((s) => s.updateTradeStatus);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    Math.max(0, Math.floor((activeTrade.expiresAt - Date.now()) / 1000))
  );
  const [localExecutionState, setLocalExecutionState] = useState<'idle' | 'executing' | 'success' | 'error'>('idle');
  const [localResponseMessage, setLocalResponseMessage] = useState<string | null>(
    activeTrade.executionError || null
  );

  const abortControllerRef = useRef<AbortController | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const executionState =
    activeTrade.status === 'executed'
      ? 'success'
      : activeTrade.status === 'executing'
        ? 'executing'
        : localExecutionState;

  const isBuy = activeTrade.side === 'buy';
  const isExecuting = executionState === 'executing';
  const isExpired = remainingSeconds <= 0 && activeTrade.status !== 'executed';

  // Safe dismiss that clears any pending auto-close timers and in-flight requests
  const handleClose = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onClose();
  }, [onClose]);

  // Clean-up on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Countdown
  useEffect(() => {
    const expiresAt = activeTrade.expiresAt;
    const tradeId = activeTrade.id;
    const tradeStatus = activeTrade.status;

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0 && tradeStatus === 'staged') {
        updateTradeStatus(tradeId, { status: 'expired' });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeTrade.expiresAt, activeTrade.id, activeTrade.status, updateTradeStatus]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExecuting) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isExecuting]);

  const handleConfirmOrder = useCallback(async () => {
    if (isExecuting || isExpired) return;

    setLocalExecutionState('executing');
    setLocalResponseMessage(null);
    updateTradeStatus(activeTrade.id, { status: 'executing' });

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/trade/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          ticketToken: activeTrade.ticketToken,
          symbol: activeTrade.symbol,
          category: activeTrade.category,
          side: activeTrade.side,
          orderType: activeTrade.orderType,
          size: activeTrade.size,
          price: activeTrade.price,
          tradeSide: activeTrade.tradeSide,
          leverage: activeTrade.leverage,
          stopLossPrice: activeTrade.stopLossPrice,
          takeProfitPrice: activeTrade.takeProfitPrice,
        }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        orderId?: string;
        error?: string;
      };

      if (json.success) {
        setLocalExecutionState('success');
        setLocalResponseMessage(json.orderId ? `Order #${json.orderId.substring(0, 8)} filled` : 'Executed');
        updateTradeStatus(activeTrade.id, { status: 'executed', orderId: json.orderId });

        if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = setTimeout(handleClose, 2000);
      } else {
        const errMsg = json.error || 'Execution rejected';
        setLocalExecutionState('error');
        setLocalResponseMessage(errMsg);
        updateTradeStatus(activeTrade.id, { status: 'staged', executionError: errMsg });
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const errMsg = err instanceof Error ? err.message : 'Network error';
      setLocalExecutionState('error');
      setLocalResponseMessage(errMsg);
      updateTradeStatus(activeTrade.id, { status: 'staged', executionError: errMsg });
    }
  }, [activeTrade, isExecuting, isExpired, updateTradeStatus, handleClose]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Subtle backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={() => !isExecuting && handleClose()}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        aria-hidden="true"
      />

      {/* Minimalist Surface */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 4 }}
        transition={{ duration: 0.18, ease: EASING_ARCHITECTURAL }}
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-2xl bg-theme-bg-surface border border-theme-border-subtle shadow-2xl overflow-hidden flex flex-col z-10"
      >
        {/* Header: Title + Countdown + Minimal Close */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`size-2 rounded-full ${isBuy ? 'bg-emerald-500' : 'bg-rose-500'}`}
            />
            <span className="font-semibold text-xs text-theme-text-primary tracking-tight">
              Confirm {isBuy ? 'Long' : 'Short'}
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
              onClick={handleClose}
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

        {/* Financial Details Ladder */}
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

        {/* Status alerts if any */}
        {executionState === 'error' && (
          <div className="mx-5 mb-3 flex items-center gap-1.5 text-2xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">
            <AlertCircle className="size-3.5 shrink-0" />
            <span className="truncate">{localResponseMessage || 'Order failed'}</span>
          </div>
        )}

        {isExpired && (
          <div className="mx-5 mb-3 text-2xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">
            Quote expired. Restage trade for updated prices.
          </div>
        )}

        {/* Single Primary Action */}
        <div className="p-5 pt-1">
          {executionState === 'idle' && (
            <button
              type="button"
              disabled={isExpired}
              onClick={handleConfirmOrder}
              className={`w-full py-2.5 px-4 rounded-xl font-medium text-xs transition-all active:scale-[0.99] select-none ${
                isExpired
                  ? 'opacity-30 cursor-not-allowed bg-theme-bg-elevated text-theme-text-muted'
                  : isBuy
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black font-semibold cursor-pointer'
                    : 'bg-rose-500 hover:bg-rose-400 text-white font-semibold cursor-pointer'
              }`}
            >
              Confirm {isBuy ? 'Buy' : 'Sell'}
            </button>
          )}

          {executionState === 'executing' && (
            <div className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-theme-bg-elevated text-theme-text-muted text-xs font-mono">
              <Loader2 className="size-3.5 animate-spin text-theme-text-primary" />
              <span>Submitting...</span>
            </div>
          )}

          {executionState === 'error' && (
            <button
              type="button"
              onClick={handleConfirmOrder}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-rose-500 hover:bg-rose-400 text-white transition-colors cursor-pointer"
            >
              Retry Submission
            </button>
          )}

          {executionState === 'success' && (
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="size-3.5" />
              <span>
                {localResponseMessage ||
                  (activeTrade.orderId
                    ? `Order #${activeTrade.orderId.substring(0, 8)} filled`
                    : 'Order executed successfully')}
              </span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*                           Main Modal Component                             */
/* -------------------------------------------------------------------------- */

export const TradeConfirmationModal = React.memo(function TradeConfirmationModal() {
  const activePopupId = useStagedTradesStore((s) => s.activePopupId);
  const activeTrade = useStagedTradesStore((s) =>
    s.stagedTrades.find((t) => t.id === s.activePopupId)
  );
  const closePopup = useStagedTradesStore((s) => s.closePopup);

  // Body scroll lock
  useEffect(() => {
    if (!activePopupId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [activePopupId]);

  return (
    <AnimatePresence>
      {activePopupId && activeTrade && (
        <TradeConfirmationDialogContent
          key={activeTrade.id}
          activeTrade={activeTrade}
          onClose={closePopup}
        />
      )}
    </AnimatePresence>
  );
});