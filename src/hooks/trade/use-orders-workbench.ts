'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { BitgetV3Position, BitgetV3OrderInfo } from '@/lib/bitget/types';

export interface OrdersWorkbenchData {
  positions: BitgetV3Position[];
  orders: BitgetV3OrderInfo[];
  timestamp: number;
}

export interface OrdersWorkbenchSummary {
  totalExposureUsdt: number;
  totalUnrealizedPnl: number;
  activePositionsCount: number;
  longsCount: number;
  shortsCount: number;
  workingOrdersCount: number;
  limitOrdersCount: number;
  planOrdersCount: number;
}

const POLL_INTERVAL_MS = 6000;

export function useOrdersWorkbench() {
  const [data, setData] = useState<OrdersWorkbenchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMissingConfig, setIsMissingConfig] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);

  const fetchWorkbenchData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const res = await fetch('/api/trade/orders', {
        method: 'GET',
        cache: 'no-store',
      });
      const json = await res.json();

      if (json.isMissingConfig) {
        setIsMissingConfig(true);
        setError(json.error || 'Bitget API credentials not configured.');
        setData(null);
      } else if (json.success && json.data) {
        setData(json.data);
        setError(null);
        setIsMissingConfig(false);
        setLastUpdated(new Date());
      } else {
        setError(json.error || 'Failed to load orders and positions');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
    } finally {
      if (isInitial) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, []);

  // Initial load and adaptive polling
  useEffect(() => {
    let isCancelled = false;

    async function initialLoad() {
      try {
        const res = await fetch('/api/trade/orders', {
          method: 'GET',
          cache: 'no-store',
        });
        const json = await res.json();
        if (isCancelled) return;

        if (json.isMissingConfig) {
          setIsMissingConfig(true);
          setError(json.error || 'Bitget API credentials not configured.');
          setData(null);
        } else if (json.success && json.data) {
          setData(json.data);
          setError(null);
          setIsMissingConfig(false);
          setLastUpdated(new Date());
        } else {
          setError(json.error || 'Failed to load orders and positions');
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Network error');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    initialLoad();

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchWorkbenchData(false);
      }
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchWorkbenchData(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchWorkbenchData]);

  // Cancel a single open order
  const cancelOrder = useCallback(
    async (orderId: string, symbol: string, category = 'usdt-futures') => {
      setIsActionPending(true);
      try {
        const res = await fetch('/api/trade/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cancel_order',
            orderId,
            symbol,
            category,
          }),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Failed to cancel order');
        }
        await fetchWorkbenchData(false);
        return { success: true, message: json.message };
      } finally {
        setIsActionPending(false);
      }
    },
    [fetchWorkbenchData]
  );

  // Cancel all open orders for a symbol
  const cancelSymbolOrders = useCallback(
    async (symbol: string, category = 'usdt-futures') => {
      setIsActionPending(true);
      try {
        const res = await fetch('/api/trade/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cancel_symbol',
            symbol,
            category,
          }),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Failed to cancel orders');
        }
        await fetchWorkbenchData(false);
        return { success: true, message: json.message };
      } finally {
        setIsActionPending(false);
      }
    },
    [fetchWorkbenchData]
  );

  // Close position
  const closePosition = useCallback(
    async (
      symbol: string,
      category: string,
      side: 'buy' | 'sell',
      size?: string,
      posSide?: 'long' | 'short' | 'net'
    ) => {
      setIsActionPending(true);
      try {
        const res = await fetch('/api/trade/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'close_position',
            symbol,
            category,
            side,
            size,
            posSide,
          }),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Failed to close position');
        }
        await fetchWorkbenchData(false);
        return { success: true, message: json.message };
      } finally {
        setIsActionPending(false);
      }
    },
    [fetchWorkbenchData]
  );

  // Derived metrics and summary
  const summary: OrdersWorkbenchSummary = useMemo(() => {
    const positions = data?.positions || [];
    const orders = data?.orders || [];

    let totalExposureUsdt = 0;
    let totalUnrealizedPnl = 0;
    let longsCount = 0;
    let shortsCount = 0;

    for (const p of positions) {
      const size = parseFloat(p.total || '0');
      const mark = parseFloat(p.markPrice || p.avgPrice || '0');
      const uPnl = parseFloat(p.unrealisedPnl || '0');

      totalExposureUsdt += size * mark;
      totalUnrealizedPnl += uPnl;

      if (p.posSide === 'long' || (p.posSide === 'net' && size > 0)) {
        longsCount++;
      } else if (p.posSide === 'short' || (p.posSide === 'net' && size < 0)) {
        shortsCount++;
      }
    }

    let limitOrdersCount = 0;
    let planOrdersCount = 0;

    for (const o of orders) {
      if (o.orderType === 'limit') {
        limitOrdersCount++;
      } else {
        planOrdersCount++;
      }
    }

    return {
      totalExposureUsdt,
      totalUnrealizedPnl,
      activePositionsCount: positions.length,
      longsCount,
      shortsCount,
      workingOrdersCount: orders.length,
      limitOrdersCount,
      planOrdersCount,
    };
  }, [data]);

  return {
    data,
    summary,
    isLoading,
    isRefreshing,
    isActionPending,
    error,
    isMissingConfig,
    lastUpdated,
    refetch: () => fetchWorkbenchData(false),
    cancelOrder,
    cancelSymbolOrders,
    closePosition,
  };
}
