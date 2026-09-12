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
  const spotCandidates = Array.from(new Set([cleanSymbol, targetSpotInstId]));
  for (const sym of spotCandidates) {
    try {
      const res = await fetch(
        `https://api.bitget.com/api/v2/spot/market/orderbook?symbol=${sym}&type=step0&limit=15`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (res.ok) {
        const json = (await res.json()) as {
          code: string;
          data?: { asks?: [string, string][]; bids?: [string, string][]; ts?: string };
        };
        if (json.code === '00000' && json.data && (json.data.asks?.length || json.data.bids?.length)) {
          return {
            asks: (json.data.asks || []).slice(0, 8),
            bids: (json.data.bids || []).slice(0, 8),
            ts: json.data.ts || String(Date.now()),
          };
        }
      }
    } catch {
      // Fall through to futures candidate
    }
  }

  const futCandidates = Array.from(new Set([cleanSymbol, targetFuturesInstId]));
  for (const sym of futCandidates) {
    try {
      const res = await fetch(
        `https://api.bitget.com/api/v2/mix/market/orderbook?symbol=${sym}&productType=USDT-FUTURES&type=step0&limit=15`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (res.ok) {
        const json = (await res.json()) as {
          code: string;
          data?: { asks?: [string, string][]; bids?: [string, string][]; ts?: string };
        };
        if (json.code === '00000' && json.data && (json.data.asks?.length || json.data.bids?.length)) {
          return {
            asks: (json.data.asks || []).slice(0, 8),
            bids: (json.data.bids || []).slice(0, 8),
            ts: json.data.ts || String(Date.now()),
          };
        }
      }
    } catch {
      // Handled silently
    }
  }

  return null;
}
