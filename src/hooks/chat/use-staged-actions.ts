'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  saveStagedAction,
  updateStagedActionStatus,
  discardStagedAction,
  extractExpiresAtFromToken,
  type StagedActionRecord,
  type StagedActionType,
  type StagedActionStatus,
} from '@/lib/db';
import {
  useStagedTradesStore,
  type StagedTradeItem,
  type StagedActionItem,
} from '@/stores/staged-trades-store';
import { USDT_FUTURES_CATEGORY } from '@/lib/bitget/constants';

export type { StagedTradeItem, StagedActionItem };
export type { StagedActionType, StagedActionStatus, StagedActionRecord };

export interface StagedActionCounts {
  total: number;
  orders: number;
  cancels: number;
  closes: number;
}

export interface UseStagedActionsReturn {
  // Action collections
  activeActions: StagedActionRecord[];
  allActions: StagedActionRecord[];
  orders: StagedActionRecord[];
  cancels: StagedActionRecord[];
  closes: StagedActionRecord[];
  counts: StagedActionCounts;

  // Status & timing
  hasHydrated: boolean;
  activePopupId: string | null;
  now: number;

  // Store actions
  openPopup: (id: string) => void;
  closePopup: () => void;
  discardAction: (id: string) => Promise<void>;
  updateActionStatus: (id: string, update: Partial<StagedActionRecord>) => Promise<void>;
  stageAction: (
    trade: Omit<StagedActionRecord, 'createdAt' | 'expiresAt' | 'status'> & {
      createdAt?: number;
      expiresAt?: number;
      status?: StagedActionStatus;
    },
    autoOpenPopup?: boolean
  ) => Promise<StagedActionRecord>;
}

/**
 * Parses tool output from stage_trade_order, cancel_order, or close_position
 * and persists it to Dexie IndexedDB with authoritative token expiresAt.
 */
export async function stageFromToolResult(
  toolName?: string,
  toolResult?: unknown,
  autoOpenPopup = true,
  conversationId?: string
): Promise<boolean> {
  if (!toolName || !toolResult || typeof toolResult !== 'object') return false;
  const res = toolResult as Record<string, unknown>;
  if (!res.success) return false;

  const now = Date.now();

  // 1. Trade Order Ticket
  if (toolName === 'stage_trade_order' && res.ticketId && res.ticketToken && res.symbol) {
    const ticketToken = String(res.ticketToken);
    const expiresAt = extractExpiresAtFromToken(ticketToken, now);

    const saved = await saveStagedAction({
      id: String(res.ticketId),
      conversationId,
      actionType: 'order',
      ticketToken,
      symbol: String(res.symbol),
      category: typeof res.category === 'string' ? res.category : USDT_FUTURES_CATEGORY,
      side: (res.side as 'buy' | 'sell') || 'buy',
      orderType: (res.orderType as 'limit' | 'market') || 'limit',
      size: typeof res.size === 'number' ? res.size : 0,
      price: typeof res.price === 'number' ? res.price : undefined,
      tradeSide: typeof res.tradeSide === 'string' ? res.tradeSide : undefined,
      leverage: typeof res.leverage === 'number' ? res.leverage : undefined,
      notionalUsdt: typeof res.notionalUsdt === 'number' ? res.notionalUsdt : undefined,
      initialMarginUsdt: typeof res.initialMarginUsdt === 'number' ? res.initialMarginUsdt : undefined,
      estimatedLiquidation: typeof res.estimatedLiquidation === 'number' ? res.estimatedLiquidation : undefined,
      stopLossPrice: typeof res.stopLossPrice === 'number' ? res.stopLossPrice : undefined,
      takeProfitPrice: typeof res.takeProfitPrice === 'number' ? res.takeProfitPrice : undefined,
      riskRewardRatio: typeof res.riskRewardRatio === 'string' ? res.riskRewardRatio : undefined,
      rationale: typeof res.rationale === 'string' ? res.rationale : undefined,
      expiresAt,
    });

    if (autoOpenPopup) {
      useStagedTradesStore.getState().openPopup(saved.id);
    }
    return true;
  }

  // 2. Order Cancellation Ticket
  if (toolName === 'cancel_order' && res.actionId && res.actionToken && res.symbol) {
    const actionToken = String(res.actionToken);
    const expiresAt = extractExpiresAtFromToken(actionToken, now);

    const saved = await saveStagedAction({
      id: String(res.actionId),
      conversationId,
      actionType: 'cancel',
      actionToken,
      action: (res.action as 'cancel_order' | 'cancel_symbol') || 'cancel_order',
      symbol: String(res.symbol),
      category: typeof res.category === 'string' ? res.category : USDT_FUTURES_CATEGORY,
      orderId: typeof res.orderId === 'string' ? res.orderId : undefined,
      clientOid: typeof res.clientOid === 'string' ? res.clientOid : undefined,
      cancelAll: Boolean(res.cancelAll),
      summary: typeof res.summary === 'string' ? res.summary : undefined,
      actionableGuidance: typeof res.actionableGuidance === 'string' ? res.actionableGuidance : undefined,
      expiresAt,
    });

    if (autoOpenPopup) {
      useStagedTradesStore.getState().openPopup(saved.id);
    }
    return true;
  }

  // 3. Position Exit / De-risk Ticket
  if (toolName === 'close_position' && res.actionId && res.actionToken && res.symbol) {
    const actionToken = String(res.actionToken);
    const expiresAt = extractExpiresAtFromToken(actionToken, now);

    const saved = await saveStagedAction({
      id: String(res.actionId),
      conversationId,
      actionType: 'close',
      actionToken,
      action: 'close_position',
      symbol: String(res.symbol),
      category: typeof res.category === 'string' ? res.category : USDT_FUTURES_CATEGORY,
      closeSide: (res.closeSide as 'buy' | 'sell') || 'sell',
      closeSize: typeof res.closeSize === 'string' ? res.closeSize : undefined,
      totalPositionSize: typeof res.totalPositionSize === 'number' ? res.totalPositionSize : undefined,
      sizePercent: typeof res.sizePercent === 'number' ? res.sizePercent : 100,
      unrealizedPnl: typeof res.unrealizedPnl === 'string' ? res.unrealizedPnl : undefined,
      markPrice: typeof res.markPrice === 'string' ? res.markPrice : undefined,
      rationale: typeof res.rationale === 'string' ? res.rationale : undefined,
      actionableGuidance: typeof res.actionableGuidance === 'string' ? res.actionableGuidance : undefined,
      expiresAt,
    });

    if (autoOpenPopup) {
      useStagedTradesStore.getState().openPopup(saved.id);
    }
    return true;
  }

  return false;
}

/**
 * Specialized hook for reactive staged actions from Dexie IndexedDB with real-time live queries.
 */
export function useStagedActions(): UseStagedActionsReturn {
  const activePopupId = useStagedTradesStore((s) => s.activePopupId);
  const openPopup = useStagedTradesStore((s) => s.openPopup);
  const closePopup = useStagedTradesStore((s) => s.closePopup);

  const rawActions = useLiveQuery(() => db.staged_actions.toArray(), []);
  const hasHydrated = rawActions !== undefined;
  const allActions = useMemo(() => rawActions ?? [], [rawActions]);

  const [now, setNow] = useState(() => Date.now());

  // Filter active pending actions
  const activeActions = useMemo(() => {
    return allActions
      .filter(
        (t) =>
          (t.status === 'staged' || t.status === 'executing') &&
          t.expiresAt > now
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [allActions, now]);

  // Separate active actions into 3 distinct categories
  const orders = useMemo(
    () => activeActions.filter((a) => a.actionType === 'order'),
    [activeActions]
  );

  const cancels = useMemo(
    () => activeActions.filter((a) => a.actionType === 'cancel'),
    [activeActions]
  );

  const closes = useMemo(
    () => activeActions.filter((a) => a.actionType === 'close'),
    [activeActions]
  );

  const counts: StagedActionCounts = useMemo(
    () => ({
      total: activeActions.length,
      orders: orders.length,
      cancels: cancels.length,
      closes: closes.length,
    }),
    [activeActions.length, orders.length, cancels.length, closes.length]
  );

  // Update clock every second only while active actions exist
  useEffect(() => {
    if (activeActions.length === 0) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [activeActions.length]);

  const discardAction = useCallback(
    async (id: string) => {
      await discardStagedAction(id);
      if (activePopupId === id) {
        closePopup();
      }
    },
    [activePopupId, closePopup]
  );

  const handleUpdateActionStatus = useCallback(
    async (id: string, update: Partial<StagedActionRecord>) => {
      await updateStagedActionStatus(id, update);
    },
    []
  );

  const handleStageAction = useCallback(
    async (
      trade: Omit<StagedActionRecord, 'createdAt' | 'expiresAt' | 'status'> & {
        createdAt?: number;
        expiresAt?: number;
        status?: StagedActionStatus;
      },
      autoOpenPopup = true
    ) => {
      const record = await saveStagedAction(trade);
      if (autoOpenPopup) {
        openPopup(record.id);
      }
      return record;
    },
    [openPopup]
  );

  return {
    activeActions,
    allActions,
    orders,
    cancels,
    closes,
    counts,
    hasHydrated,
    activePopupId,
    now,
    openPopup,
    closePopup,
    discardAction,
    updateActionStatus: handleUpdateActionStatus,
    stageAction: handleStageAction,
  };
}

