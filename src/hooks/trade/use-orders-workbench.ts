'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

// Immutable helper to merge position delta updates
function applyPositionDelta(current: BitgetV3Position[], updates: BitgetV3Position[]): BitgetV3Position[] {
  const list = [...current];
  for (const inc of updates) {
    const totalNum = parseFloat(inc.total || '0');
    const idx = list.findIndex(
      (p) => p.symbol === inc.symbol && (p.posSide === inc.posSide || (!p.posSide && !inc.posSide))
    );

    if (totalNum === 0) {
      if (idx !== -1) list.splice(idx, 1);
    } else if (idx !== -1) {
      list[idx] = { ...list[idx], ...inc };
    } else {
      list.unshift(inc);
    }
  }
  return list;
}

// Immutable helper to merge order delta updates
function applyOrderDelta(current: BitgetV3OrderInfo[], updates: BitgetV3OrderInfo[]): BitgetV3OrderInfo[] {
  const list = [...current];
  for (const inc of updates) {
    const isTerminal = inc.status === 'filled' || inc.status === 'cancelled';
    const idx = list.findIndex(
      (o) => o.orderId === inc.orderId || (o.clientOid && inc.clientOid && o.clientOid === inc.clientOid)
    );

    if (isTerminal) {
      if (idx !== -1) list.splice(idx, 1);
    } else if (idx !== -1) {
      list[idx] = { ...list[idx], ...inc };
    } else {
      list.unshift(inc);
    }
  }
  return list;
}

export function useOrdersWorkbench() {
  const [data, setData] = useState<OrdersWorkbenchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMissingConfig, setIsMissingConfig] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // RAF Update Batching Buffer (coalesces micro-deltas during high volatility to display refresh rate)
  const pendingPositionsDeltaRef = useRef<BitgetV3Position[]>([]);
  const pendingOrdersDeltaRef = useRef<BitgetV3OrderInfo[]>([]);
  const rafIdRef = useRef<number | null>(null);

  // Atomic flush of pending deltas once per animation frame
  const flushBatchUpdates = useCallback(() => {
    if (!isMountedRef.current) return;
    const posUpdates = pendingPositionsDeltaRef.current;
    const ordUpdates = pendingOrdersDeltaRef.current;
    pendingPositionsDeltaRef.current = [];
    pendingOrdersDeltaRef.current = [];

    if (posUpdates.length === 0 && ordUpdates.length === 0) return;

    setData((prev) => ({
      positions: posUpdates.length > 0 ? applyPositionDelta(prev?.positions || [], posUpdates) : prev?.positions || [],
      orders: ordUpdates.length > 0 ? applyOrderDelta(prev?.orders || [], ordUpdates) : prev?.orders || [],
      timestamp: Date.now(),
    }));
    setLastUpdated(new Date());
  }, []);

  const scheduleBatchFlush = useCallback(() => {
    if (typeof window === 'undefined') {
      flushBatchUpdates();
      return;
    }
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        flushBatchUpdates();
      });
    }
  }, [flushBatchUpdates]);

  // Background / on-demand REST reconciliation
  const fetchWorkbenchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/trade/orders', { method: 'GET', cache: 'no-store' });
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
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Real-Time SSE Stream Listener
  useEffect(() => {
    isMountedRef.current = true;
    let retryDelay = 2000;

    const connectStream = async () => {
      if (!isMountedRef.current) return;
      abortControllerRef.current?.abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/trade/stream', {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Stream connection failed with HTTP ${response.status}`);
        }

        setIsWsConnected(true);
        setIsLoading(false);
        setError(null);
        retryDelay = 2000;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (isMountedRef.current) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const block of lines) {
            if (!block.trim() || block.startsWith(':')) continue;

            let eventType = 'message';
            let eventData = '';
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) eventType = line.slice(6).trim();
              else if (line.startsWith('data:')) eventData = line.slice(5).trim();
            }

            if (!eventData) continue;

            try {
              const parsed = JSON.parse(eventData);
              if (eventType === 'snapshot') {
                setData({
                  positions: parsed.positions || [],
                  orders: parsed.orders || [],
                  timestamp: parsed.timestamp || Date.now(),
                });
                setIsLoading(false);
                setIsMissingConfig(false);
                setError(null);
                setLastUpdated(new Date());
              } else if (
                (eventType === 'positions_snapshot' || eventType === 'positions_update') &&
                Array.isArray(parsed.positions)
              ) {
                if (eventType === 'positions_update' || parsed.positions.length > 0) {
                  pendingPositionsDeltaRef.current.push(...parsed.positions);
                  scheduleBatchFlush();
                }
              } else if (eventType === 'orders_update' && Array.isArray(parsed.orders)) {
                pendingOrdersDeltaRef.current.push(...parsed.orders);
                scheduleBatchFlush();
              } else if (eventType === 'error') {
                if (parsed.isMissingConfig) setIsMissingConfig(true);
                setError(parsed.error || 'Stream error');
              }
            } catch {
              // Ignore malformed frame
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setIsWsConnected(false);
        if (isMountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              retryDelay = Math.min(retryDelay * 1.5, 15000);
              connectStream();
            }
          }, retryDelay);
        }
      }
    };

    connectStream();

    // Background REST reconciliation (every 2.5s when tab visible)
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchWorkbenchData();
      }
    }, 2500);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchWorkbenchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      abortControllerRef.current?.abort();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [scheduleBatchFlush, fetchWorkbenchData]);

  // Unified Trade Action Dispatcher
  const executeTradeAction = useCallback(
    async (payload: Record<string, unknown>) => {
      setIsActionPending(true);
      try {
        const res = await fetch('/api/trade/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Trade action failed');
        }
        await fetchWorkbenchData();
        return { success: true, message: json.message as string | undefined };
      } finally {
        setIsActionPending(false);
      }
    },
    [fetchWorkbenchData]
  );

  const cancelOrder = useCallback(
    (orderId: string, symbol: string, category = 'usdt-futures') =>
      executeTradeAction({ action: 'cancel_order', orderId, symbol, category }),
    [executeTradeAction]
  );

  const cancelSymbolOrders = useCallback(
    (symbol: string, category = 'usdt-futures') =>
      executeTradeAction({ action: 'cancel_symbol', symbol, category }),
    [executeTradeAction]
  );

  const closePosition = useCallback(
    (
      symbol: string,
      category: string,
      side: 'buy' | 'sell',
      size?: string,
      posSide?: 'long' | 'short' | 'net'
    ) => executeTradeAction({ action: 'close_position', symbol, category, side, size, posSide }),
    [executeTradeAction]
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
      totalExposureUsdt += size * mark;
      totalUnrealizedPnl += parseFloat(p.unrealisedPnl || '0');

      const isLong = p.posSide === 'long' || (p.posSide === 'net' && size > 0);
      const isShort = p.posSide === 'short' || (p.posSide === 'net' && size < 0);
      if (isLong) longsCount++;
      else if (isShort) shortsCount++;
    }

    const limitOrdersCount = orders.filter((o) => o.orderType === 'limit').length;

    return {
      totalExposureUsdt,
      totalUnrealizedPnl,
      activePositionsCount: positions.length,
      longsCount,
      shortsCount,
      workingOrdersCount: orders.length,
      limitOrdersCount,
      planOrdersCount: orders.length - limitOrdersCount,
    };
  }, [data]);

  return {
    data,
    summary,
    isLoading,
    isRefreshing,
    isWsConnected,
    isActionPending,
    error,
    isMissingConfig,
    lastUpdated,
    refetch: () => fetchWorkbenchData(),
    cancelOrder,
    cancelSymbolOrders,
    closePosition,
  };
}