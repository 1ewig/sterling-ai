'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStagedTradesStore, type StagedTradeItem, type StagedActionType } from '@/stores/staged-trades-store';

export type { StagedTradeItem, StagedActionType };

export interface StagedActionCounts {
  total: number;
  orders: number;
  cancels: number;
  closes: number;
}

export interface UseStagedActionsReturn {
  // Action collections
  activeActions: StagedTradeItem[];
  orders: StagedTradeItem[];
  cancels: StagedTradeItem[];
  closes: StagedTradeItem[];
  counts: StagedActionCounts;

  // Status & timing
  hasHydrated: boolean;
  activePopupId: string | null;
  now: number;

  // Store actions
  openPopup: (id: string) => void;
  closePopup: () => void;
  discardAction: (id: string) => void;
  updateActionStatus: (id: string, update: Partial<StagedTradeItem>) => void;
  stageAction: (
    trade: Omit<StagedTradeItem, 'createdAt' | 'expiresAt' | 'status'> & {
      createdAt?: number;
      expiresAt?: number;
    },
    autoOpenPopup?: boolean
  ) => void;
}

/**
 * Parses tool output from stage_trade_order, cancel_order, or close_position
 * and stages it into the store. Returns true if successfully staged.
 */
export function stageFromToolResult(
  toolName?: string,
  toolResult?: unknown,
  autoOpenPopup = true
): boolean {
  if (!toolName || !toolResult || typeof toolResult !== 'object') return false;
  const res = toolResult as Record<string, unknown>;
  if (!res.success) return false;

  const store = useStagedTradesStore.getState();

  // 1. Trade Order Ticket
  if (toolName === 'stage_trade_order' && res.ticketId && res.ticketToken && res.symbol) {
    store.stageTrade(
      {
        id: String(res.ticketId),
        actionType: 'order',
        ticketToken: String(res.ticketToken),
        symbol: String(res.symbol),
        category: typeof res.category === 'string' ? res.category : 'USDT-FUTURES',
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
      },
      autoOpenPopup
    );
    return true;
  }

  // 2. Order Cancellation Ticket
  if (toolName === 'cancel_order' && res.actionId && res.actionToken && res.symbol) {
    store.stageTrade(
      {
        id: String(res.actionId),
        actionType: 'cancel',
        actionToken: String(res.actionToken),
        action: (res.action as 'cancel_order' | 'cancel_symbol') || 'cancel_order',
        symbol: String(res.symbol),
        category: typeof res.category === 'string' ? res.category : 'USDT-FUTURES',
        orderId: typeof res.orderId === 'string' ? res.orderId : undefined,
        clientOid: typeof res.clientOid === 'string' ? res.clientOid : undefined,
        cancelAll: Boolean(res.cancelAll),
        summary: typeof res.summary === 'string' ? res.summary : undefined,
        actionableGuidance: typeof res.actionableGuidance === 'string' ? res.actionableGuidance : undefined,
      },
      autoOpenPopup
    );
    return true;
  }

  // 3. Position Exit / De-risk Ticket
  if (toolName === 'close_position' && res.actionId && res.actionToken && res.symbol) {
    store.stageTrade(
      {
        id: String(res.actionId),
        actionType: 'close',
        actionToken: String(res.actionToken),
        action: 'close_position',
        symbol: String(res.symbol),
        category: typeof res.category === 'string' ? res.category : 'USDT-FUTURES',
        closeSide: (res.closeSide as 'buy' | 'sell') || 'sell',
        closeSize: typeof res.closeSize === 'string' ? res.closeSize : undefined,
        totalPositionSize: typeof res.totalPositionSize === 'number' ? res.totalPositionSize : undefined,
        sizePercent: typeof res.sizePercent === 'number' ? res.sizePercent : 100,
        unrealizedPnl: typeof res.unrealizedPnl === 'string' ? res.unrealizedPnl : undefined,
        markPrice: typeof res.markPrice === 'string' ? res.markPrice : undefined,
        rationale: typeof res.rationale === 'string' ? res.rationale : undefined,
        actionableGuidance: typeof res.actionableGuidance === 'string' ? res.actionableGuidance : undefined,
      },
      autoOpenPopup
    );
    return true;
  }

  return false;
}

/**
 * Specialized hook for managing staged actions, countdowns, and categorization.
 */
export function useStagedActions(): UseStagedActionsReturn {
  const stagedTrades = useStagedTradesStore((s) => s.stagedTrades);
  const hasHydrated = useStagedTradesStore((s) => s._hasHydrated);
  const activePopupId = useStagedTradesStore((s) => s.activePopupId);
  const openPopup = useStagedTradesStore((s) => s.openPopup);
  const closePopup = useStagedTradesStore((s) => s.closePopup);
  const discardTrade = useStagedTradesStore((s) => s.discardTrade);
  const updateTradeStatus = useStagedTradesStore((s) => s.updateTradeStatus);
  const stageTrade = useStagedTradesStore((s) => s.stageTrade);

  const [now, setNow] = useState(() => Date.now());

  // Filter active pending actions
  const activeActions = useMemo(() => {
    return stagedTrades.filter(
      (t) => (t.status === 'staged' || t.status === 'executing') && (t.expiresAt ? t.expiresAt > now : true)
    );
  }, [stagedTrades, now]);

  // Separate active actions into 3 distinct categories
  const orders = useMemo(
    () => activeActions.filter((a) => (a.actionType || 'order') === 'order'),
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
    (id: string) => {
      discardTrade(id);
    },
    [discardTrade]
  );

  return {
    activeActions,
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
    updateActionStatus: updateTradeStatus,
    stageAction: stageTrade,
  };
}
