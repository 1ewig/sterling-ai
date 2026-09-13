'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Minimize2,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useStagedTradesStore } from '@/stores/staged-trades-store';
import { EASING_ARCHITECTURAL, tapScalePill } from '@/constants/animation';

export const TradeConfirmationModal = React.memo(function TradeConfirmationModal() {
  const stagedTrades = useStagedTradesStore((s) => s.stagedTrades);
  const activePopupId = useStagedTradesStore((s) => s.activePopupId);
  const closePopup = useStagedTradesStore((s) => s.closePopup);
  const discardTrade = useStagedTradesStore((s) => s.discardTrade);
  const updateTradeStatus = useStagedTradesStore((s) => s.updateTradeStatus);

  const activeTrade = stagedTrades.find((t) => t.id === activePopupId);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);
  const [localExecutionState, setLocalExecutionState] = useState<'idle' | 'executing' | 'success' | 'error'>('idle');
  const [localResponseMessage, setLocalResponseMessage] = useState<string | null>(null);

  const executionState =
    activeTrade?.status === 'executed'
      ? 'success'
      : activeTrade?.status === 'executing'
      ? 'executing'
      : localExecutionState;

  const responseMessage =
    activeTrade?.status === 'executed' && activeTrade.orderId
      ? `Order #${activeTrade.orderId.substring(0, 10)} Placed`
      : localResponseMessage;

  // Live countdown timer based on activeTrade.expiresAt
  useEffect(() => {
    if (!activeTrade) return;

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
  }, [activeTrade, updateTradeStatus]);

  // Escape key minimizes the popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activePopupId) {
        closePopup();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePopupId, closePopup]);

  const handleConfirmOrder = useCallback(async () => {
    if (!activeTrade || executionState === 'executing') return;

    setLocalExecutionState('executing');
    setLocalResponseMessage(null);
    updateTradeStatus(activeTrade.id, { status: 'executing' });

    try {
      const res = await fetch('/api/trade/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        message?: string;
      };

      if (json.success) {
        setLocalExecutionState('success');
        const msg = json.orderId
          ? `Order #${json.orderId.substring(0, 10)} Filled / Placed`
          : 'Order executed successfully';
        setLocalResponseMessage(msg);
        updateTradeStatus(activeTrade.id, {
          status: 'executed',
          orderId: json.orderId,
        });

        // Automatically close modal after 3 seconds on success
        setTimeout(() => {
          closePopup();
        }, 3000);
      } else {
        setLocalExecutionState('error');
        const errMsg = json.error || 'Order execution rejected';
        setLocalResponseMessage(errMsg);
        updateTradeStatus(activeTrade.id, {
          status: 'staged',
          executionError: errMsg,
        });
      }
    } catch (err) {
      setLocalExecutionState('error');
      const errMsg = err instanceof Error ? err.message : 'Network error occurred';
      setLocalResponseMessage(errMsg);
      updateTradeStatus(activeTrade.id, {
        status: 'staged',
        executionError: errMsg,
      });
    }
  }, [
    activeTrade,
    executionState,
    updateTradeStatus,
    closePopup,
    setLocalExecutionState,
    setLocalResponseMessage,
  ]);

  const isBuy = activeTrade?.side === 'buy';
  const isExpired = remainingSeconds <= 0 && activeTrade?.status !== 'executed';
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <AnimatePresence>
      {activePopupId && activeTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closePopup}
            className="absolute inset-0 bg-theme-bg-base/70 backdrop-blur-xs select-none"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.26, ease: EASING_ARCHITECTURAL }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trade-confirmation-title"
            className="relative w-full max-w-lg rounded-xl bg-theme-bg-surface border border-theme-border-subtle shadow-2xl overflow-hidden flex flex-col z-10"
          >
            {/* Top Bar / Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border-subtle/60 bg-theme-bg-elevated/30">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded bg-theme-brand-primary/10 border border-theme-brand-primary/25 text-theme-brand-primary">
                  <ShieldCheck className="size-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h2
                    id="trade-confirmation-title"
                    className="text-xs sm:text-sm font-bold text-theme-text-primary uppercase tracking-wide truncate"
                  >
                    Staged Trade Confirmation
                  </h2>
                  <span className="font-mono text-2xs text-theme-text-muted truncate">
                    Ticket #{activeTrade.id.substring(0, 14)}
                  </span>
                </div>
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Countdown pill */}
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono text-2xs select-none border ${
                    isExpired
                      ? 'bg-theme-status-danger/10 text-theme-status-danger border-theme-status-danger/30'
                      : remainingSeconds < 60
                        ? 'bg-theme-status-warning/10 text-theme-status-warning border-theme-status-warning/30 animate-pulse'
                        : 'bg-theme-bg-elevated text-theme-text-secondary border-theme-border-subtle'
                  }`}
                  title="Cryptographic ticket validity window"
                >
                  <Clock className="size-3" />
                  <span>{isExpired ? 'Expired' : timeFormatted}</span>
                </div>

                {/* Minimize to Header Button */}
                <motion.button
                  type="button"
                  whileTap={tapScalePill}
                  onClick={closePopup}
                  title="Minimize to Header"
                  aria-label="Minimize to Header"
                  className="size-7 rounded-lg flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-elevated transition-colors cursor-pointer"
                >
                  <Minimize2 className="size-3.5" />
                </motion.button>

                {/* Discard Button */}
                <motion.button
                  type="button"
                  whileTap={tapScalePill}
                  onClick={() => discardTrade(activeTrade.id)}
                  title="Discard Order"
                  aria-label="Discard Order"
                  className="size-7 rounded-lg flex items-center justify-center text-theme-status-danger hover:bg-theme-status-danger/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                </motion.button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex flex-col gap-3 text-xs">
              {/* Asset & Direction Banner */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-theme-bg-elevated/40 border border-theme-border-subtle/60">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2 py-1 rounded font-mono font-bold text-xs uppercase ${
                      isBuy
                        ? 'bg-theme-status-success/20 text-theme-status-success border border-theme-status-success/30'
                        : 'bg-theme-status-danger/20 text-theme-status-danger border border-theme-status-danger/30'
                    }`}
                  >
                    {isBuy ? 'BUY / LONG' : 'SELL / SHORT'}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-mono font-bold text-sm text-theme-text-primary">
                      {activeTrade.symbol}
                    </span>
                    <span className="text-2xs text-theme-text-muted uppercase font-mono">
                      {activeTrade.category} • {activeTrade.orderType}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xs text-theme-text-muted block">Target Price</span>
                  <span className="font-mono font-bold text-sm text-theme-brand-primary">
                    ${activeTrade.price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Primary Sizing & Risk Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="flex flex-col p-2 rounded bg-theme-bg-elevated/30 border border-theme-border-subtle/40">
                  <span className="text-theme-text-muted text-2xs uppercase">Order Size</span>
                  <span className="font-mono font-bold text-theme-text-primary text-xs">
                    {activeTrade.size}
                  </span>
                </div>
                <div className="flex flex-col p-2 rounded bg-theme-bg-elevated/30 border border-theme-border-subtle/40">
                  <span className="text-theme-text-muted text-2xs uppercase">Notional Value</span>
                  <span className="font-mono font-bold text-theme-text-primary text-xs">
                    ${activeTrade.notionalUsdt?.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col p-2 rounded bg-theme-bg-elevated/30 border border-theme-border-subtle/40">
                  <span className="text-theme-text-muted text-2xs uppercase">
                    Est. Margin ({activeTrade.leverage}x)
                  </span>
                  <span className="font-mono font-bold text-theme-text-primary text-xs">
                    ${activeTrade.initialMarginUsdt?.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col p-2 rounded bg-theme-bg-elevated/30 border border-theme-border-subtle/40">
                  <span className="text-theme-text-muted text-2xs uppercase">Est. Liquidation</span>
                  <span className="font-mono font-bold text-theme-status-warning text-xs">
                    {activeTrade.estimatedLiquidation
                      ? `$${activeTrade.estimatedLiquidation.toFixed(2)}`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* TP / SL / Risk:Reward */}
              {(activeTrade.stopLossPrice || activeTrade.takeProfitPrice) && (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-theme-bg-elevated/40 border border-theme-border-subtle/50 text-xs font-mono">
                  {activeTrade.stopLossPrice && (
                    <div className="flex items-center gap-1.5 text-theme-status-danger">
                      <ArrowDownRight className="size-3.5" />
                      <span>SL: ${activeTrade.stopLossPrice}</span>
                    </div>
                  )}
                  {activeTrade.takeProfitPrice && (
                    <div className="flex items-center gap-1.5 text-theme-status-success">
                      <ArrowUpRight className="size-3.5" />
                      <span>TP: ${activeTrade.takeProfitPrice}</span>
                    </div>
                  )}
                  {activeTrade.riskRewardRatio && (
                    <span className="text-theme-brand-accent font-bold">
                      R:R {activeTrade.riskRewardRatio}
                    </span>
                  )}
                </div>
              )}

              {/* Rationale Quote */}
              {activeTrade.rationale && (
                <div className="p-2.5 rounded bg-theme-bg-elevated/20 border border-theme-border-subtle/40">
                  <span className="text-2xs font-semibold text-theme-text-muted uppercase block mb-0.5">
                    Analyst Rationale
                  </span>
                  <p className="text-2xs text-theme-text-secondary italic leading-relaxed">
                    &ldquo;{activeTrade.rationale}&rdquo;
                  </p>
                </div>
              )}

              {/* Status / Feedback Banners */}
              {executionState === 'success' && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-theme-status-success/15 border border-theme-status-success/30 text-theme-status-success text-xs font-mono font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>{responseMessage || 'Order Submitted Successfully'}</span>
                  </div>
                  <span className="text-2xs uppercase opacity-80 font-mono">Bitget v3</span>
                </div>
              )}

              {executionState === 'error' && (
                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-theme-status-danger/15 border border-theme-status-danger/30 text-theme-status-danger text-xs">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="size-4 shrink-0" />
                    <span className="truncate">{responseMessage || 'Order Execution Failed'}</span>
                  </div>
                </div>
              )}

              {isExpired && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-theme-status-danger/10 border border-theme-status-danger/20 text-theme-status-danger text-2xs">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>
                    Cryptographic ticket expired. Please ask Sterling to restage with refreshed prices.
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Actions Footer */}
            <div className="p-4 pt-2 border-t border-theme-border-subtle/50 bg-theme-bg-elevated/20 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={closePopup}
                className="w-full sm:w-auto px-3.5 py-2 rounded-lg text-xs font-semibold text-theme-text-secondary hover:text-theme-text-primary bg-theme-bg-surface hover:bg-theme-bg-elevated border border-theme-border-subtle transition-colors cursor-pointer select-none flex items-center justify-center gap-1.5"
              >
                <Minimize2 className="size-3.5" />
                <span>Minimize to Header</span>
              </button>

              <button
                type="button"
                onClick={() => discardTrade(activeTrade.id)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-lg text-xs font-semibold text-theme-status-danger/90 hover:text-theme-status-danger bg-transparent hover:bg-theme-status-danger/10 border border-transparent hover:border-theme-status-danger/20 transition-colors cursor-pointer select-none flex items-center justify-center gap-1.5"
              >
                <Trash2 className="size-3.5" />
                <span>Discard</span>
              </button>

              <div className="flex-1 w-full sm:w-auto">
                {executionState === 'idle' && (
                  <button
                    type="button"
                    disabled={isExpired}
                    onClick={handleConfirmOrder}
                    className={`w-full py-2 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer select-none ${
                      isExpired
                        ? 'opacity-40 cursor-not-allowed bg-theme-bg-elevated text-theme-text-muted border border-theme-border-subtle'
                        : isBuy
                          ? 'bg-theme-status-success hover:bg-theme-status-success/90 text-white'
                          : 'bg-theme-status-danger hover:bg-theme-status-danger/90 text-white'
                    }`}
                  >
                    <ShieldCheck className="size-4" />
                    <span>Confirm & Submit {isBuy ? 'BUY' : 'SELL'} Order</span>
                  </button>
                )}

                {executionState === 'executing' && (
                  <div className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-theme-bg-elevated text-theme-text-muted text-xs font-mono border border-theme-border-subtle">
                    <Loader2 className="size-4 animate-spin text-theme-brand-primary" />
                    <span>Signing & Transmitting Order...</span>
                  </div>
                )}

                {executionState === 'error' && (
                  <button
                    type="button"
                    onClick={handleConfirmOrder}
                    className="w-full py-2 px-4 rounded-lg font-bold text-xs bg-theme-status-danger text-white hover:bg-theme-status-danger/90 transition-colors cursor-pointer select-none flex items-center justify-center gap-1.5"
                  >
                    <span>Retry Submission</span>
                  </button>
                )}

                {executionState === 'success' && (
                  <button
                    type="button"
                    onClick={closePopup}
                    className="w-full py-2 px-4 rounded-lg font-bold text-xs bg-theme-status-success text-white transition-colors cursor-pointer select-none flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>Done</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
