'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useStagedActions } from '@/hooks/chat';
import { StagedActionsDropdown } from './staged-actions-dropdown';
import { OrderConfirmationModal } from './order-confirmation-modal';
import { CancelOrderModal } from './cancel-order-modal';
import { ClosePositionModal } from './close-position-modal';

export interface StagedActionsClientProps {
  renderPill?: boolean;
  renderModals?: boolean;
}

const emptySubscribe = () => () => {};

/**
 * Dedicated client for staged actions.
 * Manages store connectivity, API calls, countdown timers, and abort signals,
 * while passing pure data and callbacks as props to all 4 UI blocks:
 * 1. StagedTradesHeaderPill
 * 2. OrderConfirmationModal
 * 3. CancelOrderModal
 * 4. ClosePositionModal
 */
export const StagedActionsClient = React.memo(function StagedActionsClient({
  renderPill = true,
  renderModals = true,
}: StagedActionsClientProps) {
  const {
    counts,
    activeActions,
    orders,
    cancels,
    closes,
    now,
    activePopupId,
    openPopup,
    closePopup,
    discardAction,
    updateActionStatus,
    hasHydrated,
  } = useStagedActions();

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [localExecutionState, setLocalExecutionState] = useState<
    'idle' | 'executing' | 'success' | 'error'
  >('idle');
  const [localResponseMessage, setLocalResponseMessage] = useState<string | null>(null);

  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Find currently active popup item
  const activeTrade = useMemo(() => {
    if (!activePopupId) return null;
    return activeActions.find((t) => t.id === activePopupId) || null;
  }, [activePopupId, activeActions]);

  // Derive execution state and response message reactively from store or local state
  const executionState =
    activeTrade?.status === 'executed'
      ? 'success'
      : activeTrade?.status === 'executing'
        ? 'executing'
        : localExecutionState;

  const responseMessage =
    activeTrade?.status === 'executed'
      ? activeTrade.orderIdResult
        ? `Order #${activeTrade.orderIdResult.substring(0, 8)} filled`
        : localResponseMessage || 'Action executed successfully'
      : localResponseMessage || activeTrade?.executionError || null;

  // Remaining seconds calculation
  const remainingSeconds = activeTrade
    ? Math.max(0, Math.floor((activeTrade.expiresAt - now) / 1000))
    : 0;

  // Auto-expire when countdown reaches zero
  useEffect(() => {
    if (activeTrade && remainingSeconds <= 0 && activeTrade.status === 'staged') {
      updateActionStatus(activeTrade.id, { status: 'expired' });
    }
  }, [activeTrade, remainingSeconds, updateActionStatus]);

  // Unified close handler
  const handleCloseModal = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLocalExecutionState('idle');
    setLocalResponseMessage(null);
    closePopup();
  }, [closePopup]);

  // Execute Order (/api/trade/execute)
  const handleConfirmOrder = useCallback(async () => {
    if (!activeTrade || executionState === 'executing' || remainingSeconds <= 0) return;

    setLocalExecutionState('executing');
    setLocalResponseMessage(null);
    updateActionStatus(activeTrade.id, { status: 'executing' });

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
        message?: string;
        error?: string;
      };

      if (json.success) {
        setLocalExecutionState('success');
        const successMsg =
          json.message ||
          (json.orderId ? `Order #${json.orderId.substring(0, 8)} filled` : 'Order executed');
        setLocalResponseMessage(successMsg);
        updateActionStatus(activeTrade.id, { status: 'executed', orderIdResult: json.orderId });

        if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = setTimeout(handleCloseModal, 2000);
      } else {
        const errMsg = json.error || 'Order execution rejected';
        setLocalExecutionState('error');
        setLocalResponseMessage(errMsg);
        updateActionStatus(activeTrade.id, { status: 'staged', executionError: errMsg });
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const errMsg = err instanceof Error ? err.message : 'Network error';
      setLocalExecutionState('error');
      setLocalResponseMessage(errMsg);
      updateActionStatus(activeTrade.id, { status: 'staged', executionError: errMsg });
    }
  }, [activeTrade, executionState, remainingSeconds, updateActionStatus, handleCloseModal]);

  // Execute Cancel (/api/trade/action)
  const handleConfirmCancel = useCallback(async () => {
    if (!activeTrade || executionState === 'executing' || remainingSeconds <= 0) return;

    setLocalExecutionState('executing');
    setLocalResponseMessage(null);
    updateActionStatus(activeTrade.id, { status: 'executing' });

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/trade/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          actionToken: activeTrade.actionToken,
          action: activeTrade.action || (activeTrade.cancelAll ? 'cancel_symbol' : 'cancel_order'),
          symbol: activeTrade.symbol,
          category: activeTrade.category,
          orderId: activeTrade.orderId,
          clientOid: activeTrade.clientOid,
        }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
      };

      if (json.success) {
        setLocalExecutionState('success');
        const successMsg =
          json.message ||
          (activeTrade.cancelAll ? 'All working orders cancelled' : 'Order cancelled successfully');
        setLocalResponseMessage(successMsg);
        updateActionStatus(activeTrade.id, { status: 'executed' });

        if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = setTimeout(handleCloseModal, 2000);
      } else {
        const errMsg = json.error || 'Cancellation rejected';
        setLocalExecutionState('error');
        setLocalResponseMessage(errMsg);
        updateActionStatus(activeTrade.id, { status: 'staged', executionError: errMsg });
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const errMsg = err instanceof Error ? err.message : 'Network error';
      setLocalExecutionState('error');
      setLocalResponseMessage(errMsg);
      updateActionStatus(activeTrade.id, { status: 'staged', executionError: errMsg });
    }
  }, [activeTrade, executionState, remainingSeconds, updateActionStatus, handleCloseModal]);

  // Execute Close Position (/api/trade/action)
  const handleConfirmClose = useCallback(async () => {
    if (!activeTrade || executionState === 'executing' || remainingSeconds <= 0) return;

    setLocalExecutionState('executing');
    setLocalResponseMessage(null);
    updateActionStatus(activeTrade.id, { status: 'executing' });

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/trade/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          actionToken: activeTrade.actionToken,
          action: 'close_position',
          symbol: activeTrade.symbol,
          category: activeTrade.category,
          side: activeTrade.closeSide || activeTrade.side,
          size: activeTrade.closeSize,
        }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
      };

      if (json.success) {
        setLocalExecutionState('success');
        const successMsg = json.message || 'Position exit submitted successfully';
        setLocalResponseMessage(successMsg);
        updateActionStatus(activeTrade.id, { status: 'executed' });

        if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = setTimeout(handleCloseModal, 2000);
      } else {
        const errMsg = json.error || 'Position exit rejected';
        setLocalExecutionState('error');
        setLocalResponseMessage(errMsg);
        updateActionStatus(activeTrade.id, { status: 'staged', executionError: errMsg });
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const errMsg = err instanceof Error ? err.message : 'Network error';
      setLocalExecutionState('error');
      setLocalResponseMessage(errMsg);
      updateActionStatus(activeTrade.id, { status: 'staged', executionError: errMsg });
    }
  }, [activeTrade, executionState, remainingSeconds, updateActionStatus, handleCloseModal]);

  const actionType = activeTrade?.actionType || 'order';
  const isOrderModalOpen = Boolean(activeTrade && actionType === 'order');
  const isCancelModalOpen = Boolean(activeTrade && actionType === 'cancel');
  const isCloseModalOpen = Boolean(activeTrade && actionType === 'close');

  return (
    <>
      {/* 1. Dropdown UI block */}
      {renderPill && (
        <StagedActionsDropdown
          counts={counts}
          activeActions={activeActions}
          orders={orders}
          cancels={cancels}
          closes={closes}
          now={now}
          onSelectAction={openPopup}
          onDiscardAction={discardAction}
          hasHydrated={hasHydrated}
        />
      )}

      {/* 2, 3, 4. Modals portaled to document.body */}
      {renderModals &&
        isMounted &&
        createPortal(
          <>
            <OrderConfirmationModal
              isOpen={isOrderModalOpen}
              activeTrade={activeTrade}
              remainingSeconds={remainingSeconds}
              executionState={executionState}
              responseMessage={responseMessage}
              onClose={handleCloseModal}
              onConfirm={handleConfirmOrder}
            />

            <CancelOrderModal
              isOpen={isCancelModalOpen}
              activeTrade={activeTrade}
              remainingSeconds={remainingSeconds}
              executionState={executionState}
              responseMessage={responseMessage}
              onClose={handleCloseModal}
              onConfirm={handleConfirmCancel}
            />

            <ClosePositionModal
              isOpen={isCloseModalOpen}
              activeTrade={activeTrade}
              remainingSeconds={remainingSeconds}
              executionState={executionState}
              responseMessage={responseMessage}
              onClose={handleCloseModal}
              onConfirm={handleConfirmClose}
            />
          </>,
          document.body
        )}
    </>
  );
});
