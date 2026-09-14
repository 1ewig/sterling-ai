'use client';

import React, { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useStagedActions, useExecuteTrade } from '@/hooks/chat';
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
 * Manages store connectivity, countdown timers, and consolidated execution pipelines,
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

  // Find currently active popup item
  const activeTrade = useMemo(() => {
    if (!activePopupId) return null;
    return activeActions.find((t) => t.id === activePopupId) || null;
  }, [activePopupId, activeActions]);

  // Remaining seconds calculation
  const remainingSeconds = activeTrade
    ? Math.max(0, Math.floor((activeTrade.expiresAt - now) / 1000))
    : 0;

  // Auto-expire when countdown reaches zero
  useEffect(() => {
    if (activeTrade && remainingSeconds <= 0 && activeTrade.status === 'staged') {
      void updateActionStatus(activeTrade.id, { status: 'expired' });
    }
  }, [activeTrade, remainingSeconds, updateActionStatus]);

  // Consolidated trade execution pipeline
  const {
    executionState,
    responseMessage,
    handleClose,
    confirmOrder,
    confirmCancel,
    confirmClose,
  } = useExecuteTrade({
    activeTrade,
    remainingSeconds,
    updateActionStatus,
    onClose: closePopup,
  });

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
              onClose={handleClose}
              onConfirm={confirmOrder}
            />

            <CancelOrderModal
              isOpen={isCancelModalOpen}
              activeTrade={activeTrade}
              remainingSeconds={remainingSeconds}
              executionState={executionState}
              responseMessage={responseMessage}
              onClose={handleClose}
              onConfirm={confirmCancel}
            />

            <ClosePositionModal
              isOpen={isCloseModalOpen}
              activeTrade={activeTrade}
              remainingSeconds={remainingSeconds}
              executionState={executionState}
              responseMessage={responseMessage}
              onClose={handleClose}
              onConfirm={confirmClose}
            />
          </>,
          document.body
        )}
    </>
  );
});

