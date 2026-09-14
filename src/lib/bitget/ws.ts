import { BITGET_REST_BASE } from './rest';
import type { BitgetWsTickerData, BitgetWsBookData, BitgetWsArg, MicroCandle } from './types';
import { isRTokenSymbol } from './formatters';

export type { BitgetWsArg, MicroCandle };

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

async function fetchCandidate<T>(
  category: 'USDT-FUTURES' | 'SPOT',
  resource: string,
  extraParams: string,
  candidates: string[],
  parser: (data: unknown, sym: string) => T | null
): Promise<T | null> {
  for (const sym of candidates) {
    try {
      const qs = `category=${category}&symbol=${sym}${extraParams ? `&${extraParams}` : ''}`;
      const res = await fetch(`${BITGET_REST_BASE}/api/v3/market/${resource}?${qs}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const json = (await res.json()) as { code: string; data?: unknown };
        if ((json.code === '00000' || json.code === '0') && json.data) {
          const parsed = parser(json.data, sym);
          if (parsed !== null) return parsed;
        }
      }
    } catch {
      // Fall through to next candidate
    }
  }
  return null;
}

/**
 * Asynchronously seeds the initial 30 1-minute candles via REST for instant 0ms chart paint.
 * Tries Futures endpoints first, then falls back to Spot.
 */
export async function seedCandlesSnapshot(
  cleanSymbol: string,
  targetSpotInstId: string,
  targetFuturesInstId: string
): Promise<{ candles: MicroCandle[]; isFutures: boolean }> {
  const futCandidates = Array.from(new Set([cleanSymbol, targetFuturesInstId]));
  const spotCandidates = Array.from(new Set([cleanSymbol, targetSpotInstId]));

  const parseCandles = (data: unknown): MicroCandle[] | null => {
    const rows = data as string[][];
    if (!Array.isArray(rows) || rows.length < 2) return null;
    return rows.map((row) => ({
      timestamp: parseInt(row[0], 10),
      close: parseFloat(row[4]),
      high: parseFloat(row[2]),
      low: parseFloat(row[3]),
    }));
  };

  const futCandles = await fetchCandidate('USDT-FUTURES', 'candles', 'interval=1m&limit=30', futCandidates, parseCandles);
  if (futCandles) return { candles: futCandles, isFutures: true };

  const spotCandles = await fetchCandidate('SPOT', 'candles', 'interval=1m&limit=30', spotCandidates, parseCandles);
  if (spotCandles) return { candles: spotCandles, isFutures: false };

  return { candles: [], isFutures: false };
}

/**
 * Asynchronously seeds the initial order book depth snapshot via REST for instant paint.
 * Tries Futures endpoints first, then falls back to Spot.
 */
export async function seedOrderbookSnapshot(
  cleanSymbol: string,
  targetSpotInstId: string,
  targetFuturesInstId: string
): Promise<{ book: BitgetWsBookData | null; isFutures: boolean }> {
  const futCandidates = Array.from(new Set([cleanSymbol, targetFuturesInstId]));
  const spotCandidates = Array.from(new Set([cleanSymbol, targetSpotInstId]));

  const parseOrderbook = (data: unknown): BitgetWsBookData | null => {
    const d = data as {
      a?: [number | string, number | string][];
      b?: [number | string, number | string][];
      asks?: [string, string][];
      bids?: [string, string][];
      ts?: string;
    };
    const rawAsks = d.a || d.asks || [];
    const rawBids = d.b || d.bids || [];
    if (!rawAsks.length && !rawBids.length) return null;
    return {
      asks: rawAsks.slice(0, 8).map(([p, s]) => [p.toString(), s.toString()]),
      bids: rawBids.slice(0, 8).map(([p, s]) => [p.toString(), s.toString()]),
      ts: d.ts || String(Date.now()),
    };
  };

  const futBook = await fetchCandidate('USDT-FUTURES', 'orderbook', 'limit=15', futCandidates, parseOrderbook);
  if (futBook) return { book: futBook, isFutures: true };

  const spotBook = await fetchCandidate('SPOT', 'orderbook', 'limit=15', spotCandidates, parseOrderbook);
  if (spotBook) return { book: spotBook, isFutures: false };

  return { book: null, isFutures: false };
}

/**
 * Asynchronously seeds the initial ticker via REST for instant 0ms hero price paint.
 * Tries Spot and Futures endpoints concurrently.
 */
export async function seedTickerSnapshot(
  cleanSymbol: string,
  targetSpotInstId: string,
  targetFuturesInstId: string
): Promise<{ spot: BitgetWsTickerData | null; futures: BitgetWsTickerData | null }> {
  const futCandidates = Array.from(new Set([cleanSymbol, targetFuturesInstId]));
  const spotCandidates = Array.from(new Set([cleanSymbol, targetSpotInstId]));

  const parseTicker = (data: unknown, sym: string): BitgetWsTickerData | null => {
    const list = data as Array<Record<string, string>>;
    const item = list?.find((t) => (t.symbol || '').toUpperCase() === sym) || list?.[0];
    if (item && (item.lastPrice || item.lastPr)) {
      return normalizeWsTicker(item as Partial<BitgetWsTickerData>, sym);
    }
    return null;
  };

  const [futRes, spotRes] = await Promise.allSettled([
    fetchCandidate('USDT-FUTURES', 'tickers', '', futCandidates, parseTicker),
    fetchCandidate('SPOT', 'tickers', '', spotCandidates, parseTicker),
  ]);

  return {
    futures: futRes.status === 'fulfilled' ? futRes.value : null,
    spot: spotRes.status === 'fulfilled' ? spotRes.value : null,
  };
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
