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

  // Helper to merge position updates into active positions
  const mergePositions = useCallback((incoming: BitgetV3Position[]) => {
    setData((prev) => {
      const current = prev?.positions ? [...prev.positions] : [];
      for (const inc of incoming) {
        const totalNum = parseFloat(inc.total || '0');
        const idx = current.findIndex(
          (p) => p.symbol === inc.symbol && (p.posSide === inc.posSide || (!p.posSide && !inc.posSide))
        );

        if (totalNum === 0) {
          // Position was closed, remove from active list
          if (idx !== -1) {
            current.splice(idx, 1);
          }
        } else {
          // Position updated or opened
          if (idx !== -1) {
            current[idx] = { ...current[idx], ...inc };
          } else {
            current.unshift(inc);
          }
        }
      }

      return {
        positions: current,
        orders: prev?.orders || [],
        timestamp: Date.now(),
      };
    });
    setLastUpdated(new Date());
  }, []);

  // Helper to merge order updates into active open orders
  const mergeOrders = useCallback((incoming: BitgetV3OrderInfo[]) => {
    setData((prev) => {
      const current = prev?.orders ? [...prev.orders] : [];
      for (const inc of incoming) {
        const isTerminal = inc.status === 'filled' || inc.status === 'cancelled';
        const idx = current.findIndex(
          (o) => o.orderId === inc.orderId || (o.clientOid && inc.clientOid && o.clientOid === inc.clientOid)
        );

        if (isTerminal) {
          if (idx !== -1) {
            current.splice(idx, 1);
          }
        } else {
          if (idx !== -1) {
            current[idx] = { ...current[idx], ...inc };
          } else {
            current.unshift(inc);
          }
        }
      }

      return {
        positions: prev?.positions || [],
        orders: current,
        timestamp: Date.now(),
      };
    });
    setLastUpdated(new Date());
  }, []);

  // Background / on-demand REST reconciliation
  const fetchWorkbenchData = useCallback(async () => {
    setIsRefreshing(true);

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
      setIsRefreshing(false);
    }
  }, []);

  // Real-Time SSE Stream Listener
  useEffect(() => {
    isMountedRef.current = true;
    let retryDelay = 2000;

    const connectStream = async () => {
      if (!isMountedRef.current) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

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
        retryDelay = 2000; // Reset retry delay on successful connect

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

            const blockLines = block.split('\n');
            for (const line of blockLines) {
              if (line.startsWith('event:')) {
                eventType = line.replace('event:', '').trim();
              } else if (line.startsWith('data:')) {
                eventData = line.replace('data:', '').trim();
              }
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
                // For snapshot acknowledgments, only merge if array has active positions
                if (eventType === 'positions_update' || parsed.positions.length > 0) {
                  mergePositions(parsed.positions);
                }
              } else if (eventType === 'orders_update' && Array.isArray(parsed.orders)) {
                mergeOrders(parsed.orders);
              } else if (eventType === 'error') {
                if (parsed.isMissingConfig) {
                  setIsMissingConfig(true);
                }
                setError(parsed.error || 'Stream error');
              }
            } catch {
              // Ignore parse error on malformed frame
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        setIsWsConnected(false);
        if (isMountedRef.current) {
          // Schedule reconnect
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

    // Background REST reconciliation (every 8s when tab visible) to keep mark prices,
    // unrealized PnL, and MMR precisely synchronized alongside real-time WS push events.
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchWorkbenchData();
      }
    }, 8000);

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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [mergePositions, mergeOrders, fetchWorkbenchData]);

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
        await fetchWorkbenchData();
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
        await fetchWorkbenchData();
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
        await fetchWorkbenchData();
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
