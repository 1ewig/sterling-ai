import type { BitgetWsBookData } from './types';

export interface MicroCandle {
  timestamp: number;
  close: number;
  high: number;
  low: number;
}

/**
 * Asynchronously seeds the initial 30 1-minute candles via REST for instant 0ms chart paint.
 * Tries Spot endpoints first, then falls back to Futures.
 */
export async function seedCandlesSnapshot(
  cleanSymbol: string,
  targetSpotInstId: string,
  targetFuturesInstId: string
): Promise<MicroCandle[]> {
  const futCandidates = Array.from(new Set([cleanSymbol, targetFuturesInstId]));
  for (const sym of futCandidates) {
    try {
      const res = await fetch(
        `https://api.bitget.com/api/v3/market/candles?category=USDT-FUTURES&symbol=${sym}&interval=1m&limit=30`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (res.ok) {
        const json = (await res.json()) as { code: string; data?: string[][] };
        if ((json.code === '00000' || json.code === '0') && json.data && json.data.length >= 2) {
          return json.data.map((row) => ({
            timestamp: parseInt(row[0], 10),
            close: parseFloat(row[4]),
            high: parseFloat(row[2]),
            low: parseFloat(row[3]),
          }));
        }
      }
    } catch {
      // Fall through
    }
  }

  const spotCandidates = Array.from(new Set([cleanSymbol, targetSpotInstId]));
  for (const sym of spotCandidates) {
    try {
      const res = await fetch(
        `https://api.bitget.com/api/v3/market/candles?category=SPOT&symbol=${sym}&interval=1m&limit=30`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (res.ok) {
        const json = (await res.json()) as { code: string; data?: string[][] };
        if ((json.code === '00000' || json.code === '0') && json.data && json.data.length >= 2) {
          return json.data.map((row) => ({
            timestamp: parseInt(row[0], 10),
            close: parseFloat(row[4]),
            high: parseFloat(row[2]),
            low: parseFloat(row[3]),
          }));
        }
      }
    } catch {
      // Fall through
    }
  }

  return [];
}


/**
 * Asynchronously seeds the initial order book depth snapshot via REST for instant paint.
 * Tries Spot endpoints first, then falls back to Futures.
 */
export async function seedOrderbookSnapshot(
  cleanSymbol: string,
  targetSpotInstId: string,
  targetFuturesInstId: string
): Promise<BitgetWsBookData | null> {
  const futCandidates = Array.from(new Set([cleanSymbol, targetFuturesInstId]));
  for (const sym of futCandidates) {
    try {
      const res = await fetch(
        `https://api.bitget.com/api/v3/market/orderbook?category=USDT-FUTURES&symbol=${sym}&limit=15`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (res.ok) {
        const json = (await res.json()) as {
          code: string;
          data?: {
            a?: [number | string, number | string][];
            b?: [number | string, number | string][];
            asks?: [string, string][];
            bids?: [string, string][];
            ts?: string;
          };
        };
        const rawAsks = json.data?.a || json.data?.asks || [];
        const rawBids = json.data?.b || json.data?.bids || [];
        if ((json.code === '00000' || json.code === '0') && (rawAsks.length || rawBids.length)) {
          return {
            asks: rawAsks.slice(0, 8).map(([p, s]) => [p.toString(), s.toString()]),
            bids: rawBids.slice(0, 8).map(([p, s]) => [p.toString(), s.toString()]),
            ts: json.data?.ts || String(Date.now()),
          };
        }
      }
    } catch {
      // Fall through to spot candidate
    }
  }

  const spotCandidates = Array.from(new Set([cleanSymbol, targetSpotInstId]));
  for (const sym of spotCandidates) {
    try {
      const res = await fetch(
        `https://api.bitget.com/api/v3/market/orderbook?category=SPOT&symbol=${sym}&limit=15`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (res.ok) {
        const json = (await res.json()) as {
          code: string;
          data?: {
            a?: [number | string, number | string][];
            b?: [number | string, number | string][];
            asks?: [string, string][];
            bids?: [string, string][];
            ts?: string;
          };
        };
        const rawAsks = json.data?.a || json.data?.asks || [];
        const rawBids = json.data?.b || json.data?.bids || [];
        if ((json.code === '00000' || json.code === '0') && (rawAsks.length || rawBids.length)) {
          return {
            asks: rawAsks.slice(0, 8).map(([p, s]) => [p.toString(), s.toString()]),
            bids: rawBids.slice(0, 8).map(([p, s]) => [p.toString(), s.toString()]),
            ts: json.data?.ts || String(Date.now()),
          };
        }
      }
    } catch {
      // Handled silently
    }
  }

  return null;
}
