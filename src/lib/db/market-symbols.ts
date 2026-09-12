import { db, type MarketSymbolRecord } from './schema';
import type { MarketSymbolItem } from '@/app/api/market/symbols/route';

const SYMBOLS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Reads all cached market symbols from Dexie IndexedDB.
 * Returns symbols sorted descending by 24h USD volume.
 */
export async function getCachedMarketSymbols(): Promise<MarketSymbolRecord[]> {
  try {
    const list = await db.market_symbols.toArray();
    return list.sort((a, b) => b.volume24h - a.volume24h);
  } catch (err) {
    console.warn('[Dexie] Failed to get cached market symbols:', err);
    return [];
  }
}

/**
 * Verifies cache freshness and synchronizes from /api/market/symbols when necessary.
 */
export async function syncMarketSymbols(force = false): Promise<MarketSymbolRecord[]> {
  try {
    const existing = await getCachedMarketSymbols();
    const now = Date.now();

    // Check if cache is still fresh, non-empty, and has full catalog coverage
    const MIN_EXPECTED_SYMBOLS = 1500;
    if (!force && existing.length >= MIN_EXPECTED_SYMBOLS) {
      const oldestOrLatest = existing[0]?.updatedAt || 0;
      if (now - oldestOrLatest < SYMBOLS_CACHE_TTL_MS) {
        return existing;
      }
    }

    // Fetch fresh symbol list from cached Next.js API route
    const res = await fetch('/api/market/symbols', {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      // If network fails, gracefully fall back to existing cached symbols
      return existing;
    }

    const json = (await res.json()) as { symbols?: MarketSymbolItem[] };
    const items = json.symbols || [];

    if (items.length === 0) {
      return existing;
    }

    const records: MarketSymbolRecord[] = items.map((item) => ({
      ...item,
      updatedAt: now,
    }));

    // Bulk put into Dexie IndexedDB
    await db.market_symbols.bulkPut(records);

    return records.sort((a, b) => b.volume24h - a.volume24h);
  } catch (err) {
    console.warn('[Dexie] Sync error for market symbols:', err);
    return await getCachedMarketSymbols();
  }
}
