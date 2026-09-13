'use client';

import React from 'react';
import { StagedActionsClient } from './staged-actions-client';
import { OrderConfirmationModal, type OrderConfirmationModalProps } from './order-confirmation-modal';
import { CancelOrderModal, type CancelOrderModalProps } from './cancel-order-modal';
import { ClosePositionModal, type ClosePositionModalProps } from './close-position-modal';
import { StagedTradesHeaderPill, type StagedTradesHeaderPillProps } from './staged-trades-header-pill';

/* -------------------------------------------------------------------------- */
/*                            Re-exported Modals & Pill                       */
/* -------------------------------------------------------------------------- */

export {
  StagedActionsClient,
  OrderConfirmationModal,
  CancelOrderModal,
  ClosePositionModal,
  StagedTradesHeaderPill,
};

export type {
  OrderConfirmationModalProps,
  CancelOrderModalProps,
  ClosePositionModalProps,
  StagedTradesHeaderPillProps,
};

/* -------------------------------------------------------------------------- */
/*                 Backward-Compatible Modal Dispatcher                       */
/* -------------------------------------------------------------------------- */

/**
 * TradeConfirmationModal renders the modals portion of the StagedActionsClient.
 */
export const TradeConfirmationModal = React.memo(function TradeConfirmationModal() {
  return <StagedActionsClient renderPill={false} />;
});

export const StagedActionModal = TradeConfirmationModal;