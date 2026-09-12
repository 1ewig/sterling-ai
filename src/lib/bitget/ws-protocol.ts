import type { BitgetWsTickerData, BitgetWsBookData } from './types';
import type { MicroCandle } from './ws-seeding';

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
