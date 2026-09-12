'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { getCachedMarketSymbols, syncMarketSymbols, type MarketSymbolRecord } from '@/lib/db';

export interface UseMarketSymbolsReturn {
  symbols: MarketSymbolRecord[];
  allSymbols: MarketSymbolRecord[];
  isLoading: boolean;
  isSyncing: boolean;
  totalCount: number;
  refresh: () => Promise<void>;
}

export interface UseMarketSymbolsOptions {
  enabled?: boolean;
}

/**
 * High-performance hook for querying and fuzzy-searching market symbols.
 * Backed by Dexie IndexedDB local cache and /api/market/symbols.
 */
export function useMarketSymbols(
  searchTerm = '',
  options: UseMarketSymbolsOptions = {}
): UseMarketSymbolsReturn {
  const { enabled = true } = options;
  const [allSymbols, setAllSymbols] = useState<MarketSymbolRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;

    async function loadSymbols() {
      setIsSyncing(true);

      // 1. Immediately read whatever is already cached in IndexedDB for 0ms paint
      const cached = await getCachedMarketSymbols();
      if (isMounted && cached.length > 0) {
        setAllSymbols(cached);
        setIsLoading(false);
      }

      // 2. Validate cache freshness in background and update if needed
      try {
        const synced = await syncMarketSymbols();
        if (isMounted) {
          startTransition(() => {
            setAllSymbols(synced);
            setIsLoading(false);
            setIsSyncing(false);
          });
        }
      } catch {
        if (isMounted) {
          setIsLoading(false);
          setIsSyncing(false);
        }
      }
    }

    loadSymbols();

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  const refresh = async () => {
    setIsSyncing(true);
    if (allSymbols.length === 0) {
      setIsLoading(true);
    }
    try {
      const fresh = await syncMarketSymbols(true);
      setAllSymbols(fresh);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  // Instant in-memory client fuzzy filter (returns all matching pairs without truncation)
  const filteredSymbols = useMemo(() => {
    const clean = searchTerm.trim().toUpperCase();
    if (!clean) {
      return allSymbols;
    }

    // Exact matches or prefix matches first, then partial contains
    const exact: MarketSymbolRecord[] = [];
    const prefix: MarketSymbolRecord[] = [];
    const contains: MarketSymbolRecord[] = [];

    for (let i = 0; i < allSymbols.length; i++) {
      const item = allSymbols[i];
      const base = item.baseAsset.toUpperCase();
      const sym = item.symbol.toUpperCase();

      if (base === clean || sym === clean) {
        exact.push(item);
      } else if (base.startsWith(clean) || sym.startsWith(clean)) {
        prefix.push(item);
      } else if (base.includes(clean) || sym.includes(clean)) {
        contains.push(item);
      }
    }

    return [...exact, ...prefix, ...contains];
  }, [allSymbols, searchTerm]);

  return {
    symbols: filteredSymbols,
    allSymbols,
    isLoading,
    isSyncing,
    totalCount: allSymbols.length,
    refresh,
  };
}
