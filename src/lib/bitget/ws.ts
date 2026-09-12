import type { BitgetWsTickerData, BitgetWsBookData } from './types';
import { isRTokenSymbol } from './formatters';

export interface BitgetWsArg {
  instType: 'spot' | 'usdt-futures' | 'SPOT' | 'USDT-FUTURES';
  topic?: 'ticker' | 'books' | 'books15' | 'candle1m';
  channel?: 'ticker' | 'books' | 'books15' | 'candle1m';
  symbol?: string;
  instId?: string;
}

export interface MicroCandle {
  timestamp: number;
  close: number;
  high: number;
  low: number;
}

/* -------------------------------------------------------------------------- */
/*                        1. Subscription Topic Builder                       */
/* -------------------------------------------------------------------------- */

/**
 * Builds clean, targeted WebSocket subscription payloads for Bitget V3 UTA public topics.
 * Prevents phantom symbol cross-multiplexing and routes spot & perpetual streams.
 */
export function buildWsSubscriptions(
  cleanSymbol: string,
  targetSpotInstId: string,
  targetFuturesInstId: string
): BitgetWsArg[] {
  const isEquity = isRTokenSymbol(cleanSymbol) || cleanSymbol.startsWith('R');
  const spotIds = Array.from(new Set(isEquity ? [cleanSymbol, targetSpotInstId] : [cleanSymbol]));
  const futIds = Array.from(new Set(isEquity ? [cleanSymbol, targetFuturesInstId] : [cleanSymbol]));

  const spotArgs: BitgetWsArg[] = spotIds.flatMap((symbol) => [
    { instType: 'spot', topic: 'ticker', symbol, channel: 'ticker', instId: symbol },
    { instType: 'spot', topic: 'books', symbol, channel: 'books', instId: symbol },
    { instType: 'spot', topic: 'candle1m', symbol, channel: 'candle1m', instId: symbol },
  ]);

  const futArgs: BitgetWsArg[] = futIds.flatMap((symbol) => [
    { instType: 'usdt-futures', topic: 'ticker', symbol, channel: 'ticker', instId: symbol },
    { instType: 'usdt-futures', topic: 'books', symbol, channel: 'books', instId: symbol },
    { instType: 'usdt-futures', topic: 'candle1m', symbol, channel: 'candle1m', instId: symbol },
  ]);

  return [...spotArgs, ...futArgs];
}

/* -------------------------------------------------------------------------- */
/*                     2. 0ms Cold-Start REST Seeders                         */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                     3. Wire Normalizers & Frame Reducers                   */
/* -------------------------------------------------------------------------- */

/**
 * Normalizes incoming Bitget V3 WebSocket ticker frames.
 * Resolves schema discrepancies between Spot and Futures topics.
 */
export function normalizeWsTicker(
  raw: Partial<BitgetWsTickerData>,
  fallbackId: string
): BitgetWsTickerData {
  const id = raw.symbol || raw.instId || fallbackId;
  return {
    instId: id,
    symbol: id,
    lastPr: raw.lastPrice || raw.lastPr || '0',
    high24h: raw.highPrice24h || raw.high24h || '0',
    low24h: raw.lowPrice24h || raw.low24h || '0',
    change24h: raw.price24hPcnt || raw.change24h || '0',
    quoteVolume: raw.turnover24h || raw.quoteVolume || '0',
    baseVolume: raw.volume24h || raw.baseVolume || '0',
    fundingRate: raw.fundingRate,
    markPrice: raw.markPrice,
    openInterest: raw.openInterest || raw.holdingAmount,
    ...raw,
  };
}

/**
 * Normalizes incoming Bitget V3 WebSocket orderbook depth frames.
 * Maps 'a'/'b' shorthand or 'asks'/'bids' into consistent tuples.
 */
export function normalizeWsOrderbook(raw: Partial<BitgetWsBookData>): BitgetWsBookData {
  return {
    asks: raw.a || raw.asks || [],
    bids: raw.b || raw.bids || [],
    ts: raw.ts,
  };
}

/**
 * Manages the sliding window of 1-minute trend candles (up to maxWindow, default 30).
 * Handles both full snapshots and incremental updates in-place.
 */
export function updateCandlesSlidingWindow(
  currentCandles: MicroCandle[],
  rawCandles: string[][],
  isSnapshot: boolean,
  maxWindow = 30
): MicroCandle[] {
  if (isSnapshot) {
    return rawCandles
      .map((row) => ({
        timestamp: parseInt(row[0], 10),
        close: parseFloat(row[4]),
        high: parseFloat(row[2]),
        low: parseFloat(row[3]),
      }))
      .slice(-maxWindow);
  }

  if (rawCandles.length === 0) return currentCandles;

  const latest = rawCandles[0];
  const latestCandle: MicroCandle = {
    timestamp: parseInt(latest[0], 10),
    close: parseFloat(latest[4]),
    high: parseFloat(latest[2]),
    low: parseFloat(latest[3]),
  };

  const updated = [...currentCandles];
  const lastIdx = updated.length - 1;
  if (lastIdx >= 0 && updated[lastIdx].timestamp === latestCandle.timestamp) {
    updated[lastIdx] = latestCandle;
  } else {
    updated.push(latestCandle);
  }
  return updated.slice(-maxWindow);
}

/**
 * Verifies whether an incoming WebSocket message instrument ID matches the target symbol,
 * factoring in tokenized synthetic equities (e.g. RTSLAUSDT spot vs TSLAUSDT futures).
 */
export function isWsInstrumentMatch(
  msgInstId: string,
  isSpot: boolean,
  cleanSymbol: string,
  targetSpotInstId: string,
  targetFuturesInstId: string
): boolean {
  return isSpot
    ? msgInstId === cleanSymbol || msgInstId === targetSpotInstId
    : msgInstId === cleanSymbol || msgInstId === targetFuturesInstId;
}
