'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BitgetAccountOverview } from '@/lib/bitget/types';

export interface UseAccountOverviewReturn {
  data: BitgetAccountOverview | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isMissingConfig: boolean;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
}

/**
 * Dedicated hook for fetching, refreshing, and managing Bitget UTA v3 account overview state.
 */
export function useAccountOverview(): UseAccountOverviewReturn {
  const [data, setData] = useState<BitgetAccountOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isMissingConfig, setIsMissingConfig] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchOverview = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const res = await fetch('/api/account/overview', {
        method: 'GET',
        cache: 'no-store',
      });

      const json = await res.json();

      if (json.success && json.data) {
        setData(json.data);
        setIsMissingConfig(false);
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
      if (isInitial) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function initialLoad() {
      try {
        const res = await fetch('/api/account/overview', {
          method: 'GET',
          cache: 'no-store',
        });

        const json = await res.json();
        if (isCancelled) return;

        if (json.success && json.data) {
          setData(json.data);
          setIsMissingConfig(false);
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
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Network error while fetching account data');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    initialLoad();

    return () => {
      isCancelled = true;
    };
  }, []);

  const refetch = useCallback(async () => {
    await fetchOverview(false);
  }, [fetchOverview]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    isMissingConfig,
    lastUpdated,
    refetch,
  };
}
