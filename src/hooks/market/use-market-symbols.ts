'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { getCachedMarketSymbols, syncMarketSymbols, type MarketSymbolRecord } from '@/lib/db';

export interface UseMarketSymbolsReturn {
  symbols: MarketSymbolRecord[];
  allSymbols: MarketSymbolRecord[];
  isLoading: boolean;
  totalCount: number;
  refresh: () => Promise<void>;
}

/**
 * High-performance hook for querying and fuzzy-searching market symbols.
 * Backed by Dexie IndexedDB local cache and /api/market/symbols.
 */
export function useMarketSymbols(searchTerm = ''): UseMarketSymbolsReturn {
  const [allSymbols, setAllSymbols] = useState<MarketSymbolRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    async function loadSymbols() {
      // 1. Immediately read whatever is already cached in IndexedDB for 0ms paint
      const cached = await getCachedMarketSymbols();
      if (isMounted && cached.length > 0) {
        setAllSymbols(cached);
        setIsLoading(false);
      }

      // 2. Validate cache freshness in background and update if needed
      const synced = await syncMarketSymbols();
      if (isMounted) {
        startTransition(() => {
          setAllSymbols(synced);
          setIsLoading(false);
        });
      }
    }

    loadSymbols();

    return () => {
      isMounted = false;
    };
  }, []);

  const refresh = async () => {
    setIsLoading(true);
    const fresh = await syncMarketSymbols(true);
    setAllSymbols(fresh);
    setIsLoading(false);
  };

  // Instant in-memory client fuzzy filter
  const filteredSymbols = useMemo(() => {
    const clean = searchTerm.trim().toUpperCase();
    if (!clean) {
      // When empty search, show top 50 by volume
      return allSymbols.slice(0, 50);
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

      // Limit results to top 60 matches for rendering performance
      if (exact.length + prefix.length + contains.length >= 60) {
        break;
      }
    }

    return [...exact, ...prefix, ...contains];
  }, [allSymbols, searchTerm]);

  return {
    symbols: filteredSymbols,
    allSymbols,
    isLoading,
    totalCount: allSymbols.length,
    refresh,
  };
}
