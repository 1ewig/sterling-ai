'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BitgetAccountOverview, BitgetV3Position } from '@/lib/bitget/types';
import { applyPositionDelta } from '@/lib/bitget/trade';
import { useTradingModeStore, getClientBitgetHeaders } from '@/stores/trading-mode-store';

export interface UsePortfolioOverviewReturn {
  data: BitgetAccountOverview | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isWsConnected: boolean;
  error: string | null;
  isMissingConfig: boolean;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
}

export type UseAccountOverviewReturn = UsePortfolioOverviewReturn;

/**
 * Dedicated hook for managing live real-time Bitget UTA v3 portfolio overview state.
 * Employs continuous SSE streaming from private WebSocket hub with in-memory RAF delta updates.
 */
export function usePortfolioOverview(): UsePortfolioOverviewReturn {
  const tradingMode = useTradingModeStore((s) => s.mode);
  const credentials = useTradingModeStore((s) => s.credentials);
  const [data, setData] = useState<BitgetAccountOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isMissingConfig, setIsMissingConfig] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // RAF Update Batching Buffer
  const pendingPositionsDeltaRef = useRef<BitgetV3Position[]>([]);
  const rafIdRef = useRef<number | null>(null);

  // Atomic flush of pending deltas once per display refresh cycle
  const flushBatchUpdates = useCallback(() => {
    if (!isMountedRef.current) return;
    const posUpdates = pendingPositionsDeltaRef.current;
    pendingPositionsDeltaRef.current = [];

    if (posUpdates.length === 0) return;

    setData((prev) => {
      if (!prev) return prev;
      const updatedPositions = applyPositionDelta(prev.positions || [], posUpdates);

      // Recompute dynamic position-based floating metrics
      const unrealizedPnlUsdt = updatedPositions.reduce(
        (sum, p) => sum + Number.parseFloat(p.unrealisedPnl || '0'),
        0
      );
      const positionValueUsdt = updatedPositions.reduce(
        (sum, p) =>
          sum +
          Math.abs(Number.parseFloat(p.total || '0')) *
            Number.parseFloat(p.markPrice || p.avgPrice || '0'),
        0
      );

      return {
        ...prev,
        positions: updatedPositions,
        unrealizedPnlUsdt: Number.parseFloat(unrealizedPnlUsdt.toFixed(2)),
        positionValueUsdt: Number.parseFloat(positionValueUsdt.toFixed(2)),
      };
    });
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

  // Silent REST reconciliation (only shows isRefreshing on manual refetch)
  const fetchOverview = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    }

    try {
      const res = await fetch('/api/account/overview', {
        method: 'GET',
        cache: 'no-store',
        headers: getClientBitgetHeaders(),
      });

      const json = await res.json();

      if (json.success && json.data) {
        setData(json.data);
        setIsMissingConfig(false);
        setError(null);
        setLastUpdated(new Date());
      } else if (json.isMissingConfig) {
        setIsMissingConfig(true);
        if (json.error) {
          setError(json.error);
        }
      } else {
        setError(json.error || 'Failed to fetch account overview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error while fetching account data');
    } finally {
      if (isManual) {
        setIsRefreshing(false);
      }
    }
  }, []);

  // Reconcile overview and manage private SSE stream when in Live mode
  useEffect(() => {
    isMountedRef.current = true;
    let retryDelay = 2000;

    const initFetch = async () => {
      await fetchOverview(false);
    };
    void initFetch();

    if (tradingMode === 'sandbox') {
      return () => {
        isMountedRef.current = false;
      };
    }

    const connectStream = async () => {
      if (!isMountedRef.current) return;
      abortControllerRef.current?.abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/account/stream', {
          method: 'GET',
          cache: 'no-store',
          headers: getClientBitgetHeaders(),
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

              if (eventType === 'snapshot' && parsed.overview) {
                setData(parsed.overview);
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
              } else if (eventType === 'account_update' && parsed.account) {
                // In-memory real-time state patch from WebSocket push
                const accList = Array.isArray(parsed.account) ? parsed.account : [parsed.account];
                setData((prev) => {
                  if (!prev) return prev;
                  const updated = { ...prev };
                  for (const acc of accList as Array<Record<string, unknown>>) {
                    if (acc.usdtEquity !== undefined || acc.equity !== undefined) {
                      const eq = Number.parseFloat(String(acc.usdtEquity || acc.equity || '0'));
                      if (eq > 0) updated.totalEquityUsdt = Number.parseFloat(eq.toFixed(2));
                    }
                    if (acc.available !== undefined) {
                      const av = Number.parseFloat(String(acc.available || '0'));
                      updated.availableEquityUsdt = Number.parseFloat(av.toFixed(2));
                    }
                    if (acc.unrealizedPL !== undefined) {
                      const upnl = Number.parseFloat(String(acc.unrealizedPL || '0'));
                      updated.unrealizedPnlUsdt = Number.parseFloat(upnl.toFixed(2));
                    }
                    if (acc.crossedRiskRate !== undefined) {
                      const risk = Number.parseFloat(String(acc.crossedRiskRate || '0'));
                      updated.marginRatioPercent = Number.parseFloat((risk * 100).toFixed(2));
                    }
                  }
                  return updated;
                });
                setLastUpdated(new Date());
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

    // Reconcile once on window visibility return (e.g. user comes back from another tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOverview(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
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
  }, [scheduleBatchFlush, fetchOverview, tradingMode, credentials]);

  const refetch = useCallback(async () => {
    await fetchOverview(true);
  }, [fetchOverview]);

  return {
    data,
    isLoading,
    isRefreshing,
    isWsConnected,
    error,
    isMissingConfig,
    lastUpdated,
    refetch,
  };
}

export const useAccountOverview = usePortfolioOverview;
