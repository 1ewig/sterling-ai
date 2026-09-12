'use client';

import { useState, useEffect, useRef } from 'react';
import type { BitgetWsTickerData, BitgetWsBookData, BitgetWsMessage } from '@/lib/bitget/types';
import { normalizeSymbol } from '@/lib/bitget/client';

export type WsConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type TickDirection = 'up' | 'down' | 'neutral';
export type MarketType = 'spot' | 'futures' | 'both';

export interface MicroCandle {
  timestamp: number;
  close: number;
  high: number;
  low: number;
}

export interface UseBitgetWebSocketOptions {
  symbol: string;
  enabled?: boolean;
}

export interface UseBitgetWebSocketReturn {
  ticker: BitgetWsTickerData | null;
  futuresTicker: BitgetWsTickerData | null;
  orderbook: BitgetWsBookData | null;
  candles: MicroCandle[];
  status: WsConnectionStatus;
  tickDirection: TickDirection;
  marketType: MarketType;
}

const WS_URL = 'wss://ws.bitget.com/v2/ws/public';
const PING_INTERVAL_MS = 20000;
const RECONNECT_BASE_DELAY_MS = 1500;
const RECONNECT_MAX_DELAY_MS = 10000;

/**
 * High-performance browser WebSocket hook for Bitget v2 public market streams.
 * Subscribes to SPOT and USDT-FUTURES ticker, depth books, and 1m candles.
 * Seamlessly adapts when an instrument is Spot-only, Futures-only, or Dual-market.
 */
export function useBitgetWebSocket({
  symbol,
  enabled = true,
}: UseBitgetWebSocketOptions): UseBitgetWebSocketReturn {
  const [spotTicker, setSpotTicker] = useState<BitgetWsTickerData | null>(null);
  const [futuresTicker, setFuturesTicker] = useState<BitgetWsTickerData | null>(null);
  const [spotOrderbookRecord, setSpotOrderbookRecord] = useState<{ symbol: string; data: BitgetWsBookData } | null>(null);
  const [futuresOrderbookRecord, setFuturesOrderbookRecord] = useState<{ symbol: string; data: BitgetWsBookData } | null>(null);
  const [spotCandlesRecord, setSpotCandlesRecord] = useState<{ symbol: string; data: MicroCandle[] } | null>(null);
  const [futuresCandlesRecord, setFuturesCandlesRecord] = useState<{ symbol: string; data: MicroCandle[] } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [tickDirection, setTickDirection] = useState<TickDirection>('neutral');
  const [reconnectTrigger, setReconnectTrigger] = useState(0);

  const prevSpotPriceRef = useRef<number | null>(null);
  const prevFuturesPriceRef = useRef<number | null>(null);
  const hasSpotRef = useRef(false);
  const tickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const spotCandlesRef = useRef<MicroCandle[]>([]);
  const futuresCandlesRef = useRef<MicroCandle[]>([]);
  const hasSpotOrderbookRef = useRef(false);
  const hasFuturesOrderbookRef = useRef(false);

  // RAF update batching buffer
  const pendingUpdatesRef = useRef<{
    spotTicker?: BitgetWsTickerData;
    futuresTicker?: BitgetWsTickerData;
    spotOrderbookRecord?: { symbol: string; data: BitgetWsBookData };
    futuresOrderbookRecord?: { symbol: string; data: BitgetWsBookData };
    spotCandlesRecord?: { symbol: string; data: MicroCandle[] };
    futuresCandlesRecord?: { symbol: string; data: MicroCandle[] };
    tickDirection?: TickDirection;
  }>({});
  const rafIdRef = useRef<number | null>(null);

  const cleanSymbol = normalizeSymbol(symbol);
  // Cross-market tokenized equity mapping (e.g. RTSLAUSDT on spot <-> TSLAUSDT on futures)
  const targetSpotInstId = cleanSymbol.startsWith('R') ? cleanSymbol : `R${cleanSymbol}`;
  const targetFuturesInstId = cleanSymbol.startsWith('R') ? cleanSymbol.slice(1) : cleanSymbol;

  // Derive status during render
  const status: WsConnectionStatus = !enabled
    ? 'disconnected'
    : isConnected
    ? 'connected'
    : hasError
    ? 'error'
    : 'connecting';

  // Derive active data during render
  const activeSpotTicker =
    spotTicker && (spotTicker.instId === cleanSymbol || spotTicker.instId === targetSpotInstId)
      ? spotTicker
      : null;
  const activeFuturesTicker =
    futuresTicker && (futuresTicker.instId === cleanSymbol || futuresTicker.instId === targetFuturesInstId)
      ? futuresTicker
      : null;
  // If spot ticker exists, use it as primary; otherwise fall back to futures ticker!
  const effectiveTicker = activeSpotTicker || activeFuturesTicker;

  const marketType: MarketType =
    activeSpotTicker && activeFuturesTicker
      ? 'both'
      : activeFuturesTicker && !activeSpotTicker
      ? 'futures'
      : 'spot';

  const activeOrderbook =
    spotOrderbookRecord?.symbol === cleanSymbol
      ? spotOrderbookRecord.data
      : futuresOrderbookRecord?.symbol === cleanSymbol
      ? futuresOrderbookRecord.data
      : null;

  const activeCandles =
    spotCandlesRecord?.symbol === cleanSymbol && spotCandlesRecord.data.length > 0
      ? spotCandlesRecord.data
      : futuresCandlesRecord?.symbol === cleanSymbol
      ? futuresCandlesRecord.data
      : [];

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) {
      return;
    }

    let isCleanedUp = false;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    prevSpotPriceRef.current = null;
    prevFuturesPriceRef.current = null;
    hasSpotRef.current = false;
    hasSpotOrderbookRef.current = false;
    hasFuturesOrderbookRef.current = false;
    spotCandlesRef.current = [];
    futuresCandlesRef.current = [];
    pendingUpdatesRef.current = {};

    const flushUpdates = () => {
      if (isCleanedUp) return;
      const pending = pendingUpdatesRef.current;
      if (pending.spotTicker !== undefined) {
        setSpotTicker(pending.spotTicker);
      }
      if (pending.futuresTicker !== undefined) {
        setFuturesTicker(pending.futuresTicker);
      }
      if (pending.spotOrderbookRecord !== undefined) {
        setSpotOrderbookRecord(pending.spotOrderbookRecord);
      }
      if (pending.futuresOrderbookRecord !== undefined) {
        setFuturesOrderbookRecord(pending.futuresOrderbookRecord);
      }
      if (pending.spotCandlesRecord !== undefined) {
        setSpotCandlesRecord(pending.spotCandlesRecord);
      }
      if (pending.futuresCandlesRecord !== undefined) {
        setFuturesCandlesRecord(pending.futuresCandlesRecord);
      }
      if (pending.tickDirection !== undefined) {
        setTickDirection(pending.tickDirection);
      }
      pendingUpdatesRef.current = {};
      rafIdRef.current = null;
    };

    const scheduleFlush = () => {
      if (rafIdRef.current === null && !isCleanedUp) {
        rafIdRef.current = requestAnimationFrame(flushUpdates);
      }
    };

    // 1. Seed initial 30 1-minute candles via REST so micro trend renders immediately
    // even if WS is idle, volume is low, or the stock market is closed on weekends
    const seedInitialCandles = async () => {
      const spotCandidates = Array.from(new Set([cleanSymbol, targetSpotInstId]));
      for (const sym of spotCandidates) {
        try {
          const spotRes = await fetch(
            `https://api.bitget.com/api/v2/spot/market/candles?symbol=${sym}&granularity=1min&limit=30`,
            { signal: AbortSignal.timeout(4000) }
          );
          if (spotRes.ok) {
            const json = (await spotRes.json()) as { code: string; data?: string[][] };
            if (json.code === '00000' && json.data && json.data.length >= 2) {
              if (isCleanedUp) return;
              if (spotCandlesRef.current.length === 0) {
                const formatted: MicroCandle[] = json.data.map((row) => ({
                  timestamp: parseInt(row[0], 10),
                  close: parseFloat(row[4]),
                  high: parseFloat(row[2]),
                  low: parseFloat(row[3]),
                }));
                spotCandlesRef.current = formatted;
                pendingUpdatesRef.current.spotCandlesRecord = { symbol: cleanSymbol, data: formatted };
                scheduleFlush();
                return;
              }
            }
          }
        } catch {
          // Fall through to next candidate
        }
      }

      const futCandidates = Array.from(new Set([cleanSymbol, targetFuturesInstId]));
      for (const sym of futCandidates) {
        try {
          const futRes = await fetch(
            `https://api.bitget.com/api/v2/mix/market/candles?productType=USDT-FUTURES&symbol=${sym}&granularity=1m&limit=30`,
            { signal: AbortSignal.timeout(4000) }
          );
          if (futRes.ok) {
            const json = (await futRes.json()) as { code: string; data?: string[][] };
            if (json.code === '00000' && json.data && json.data.length >= 2) {
              if (isCleanedUp) return;
              if (futuresCandlesRef.current.length === 0) {
                const formatted: MicroCandle[] = json.data.map((row) => ({
                  timestamp: parseInt(row[0], 10),
                  close: parseFloat(row[4]),
                  high: parseFloat(row[2]),
                  low: parseFloat(row[3]),
                }));
                futuresCandlesRef.current = formatted;
                pendingUpdatesRef.current.futuresCandlesRecord = { symbol: cleanSymbol, data: formatted };
                scheduleFlush();
                return;
              }
            }
          }
        } catch {
          // Handled silently
        }
      }
    };

    // 2. Seed initial orderbook snapshot via REST for instant paint
    const seedInitialOrderbook = async () => {
      const spotCandidates = Array.from(new Set([cleanSymbol, targetSpotInstId]));
      for (const sym of spotCandidates) {
        try {
          const spotRes = await fetch(
            `https://api.bitget.com/api/v2/spot/market/orderbook?symbol=${sym}&type=step0&limit=15`,
            { signal: AbortSignal.timeout(4000) }
          );
          if (spotRes.ok) {
            const json = (await spotRes.json()) as {
              code: string;
              data?: { asks?: [string, string][]; bids?: [string, string][]; ts?: string };
            };
            if (json.code === '00000' && json.data && (json.data.asks?.length || json.data.bids?.length)) {
              if (isCleanedUp) return;
              if (!pendingUpdatesRef.current.spotOrderbookRecord && !hasSpotOrderbookRef.current) {
                const record = {
                  symbol: cleanSymbol,
                  data: {
                    asks: (json.data.asks || []).slice(0, 8),
                    bids: (json.data.bids || []).slice(0, 8),
                    ts: json.data.ts || String(Date.now()),
                  },
                };
                pendingUpdatesRef.current.spotOrderbookRecord = record;
                scheduleFlush();
                return;
              }
            }
          }
        } catch {
          // Fall through to next candidate
        }
      }

      const futCandidates = Array.from(new Set([cleanSymbol, targetFuturesInstId]));
      for (const sym of futCandidates) {
        try {
          const futRes = await fetch(
            `https://api.bitget.com/api/v2/mix/market/orderbook?symbol=${sym}&productType=USDT-FUTURES&type=step0&limit=15`,
            { signal: AbortSignal.timeout(4000) }
          );
          if (futRes.ok) {
            const json = (await futRes.json()) as {
              code: string;
              data?: { asks?: [string, string][]; bids?: [string, string][]; ts?: string };
            };
            if (json.code === '00000' && json.data && (json.data.asks?.length || json.data.bids?.length)) {
              if (isCleanedUp) return;
              if (!pendingUpdatesRef.current.futuresOrderbookRecord && !hasFuturesOrderbookRef.current) {
                const record = {
                  symbol: cleanSymbol,
                  data: {
                    asks: (json.data.asks || []).slice(0, 8),
                    bids: (json.data.bids || []).slice(0, 8),
                    ts: json.data.ts || String(Date.now()),
                  },
                };
                pendingUpdatesRef.current.futuresOrderbookRecord = record;
                scheduleFlush();
                return;
              }
            }
          }
        } catch {
          // Handled silently
        }
      }
    };

    seedInitialCandles();
    seedInitialOrderbook();

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      if (isCleanedUp) return;
      setIsConnected(true);
      setHasError(false);
      retryCountRef.current = 0;
      console.log(`[Bitget WS] Connected (${cleanSymbol})`);

      // Keepalive heartbeat
      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, PING_INTERVAL_MS);

      // Channel subscriptions: Subscribe to both SPOT and USDT-FUTURES channels.
      // Notice: For tokenized equities (e.g. TSLA <-> RTSLA), multiplex both Spot rToken
      // and Futures perpetual so traders get dual-market live visibility.
      const spotIds = Array.from(new Set([cleanSymbol, targetSpotInstId]));
      const futIds = Array.from(new Set([cleanSymbol, targetFuturesInstId]));

      const spotArgs = spotIds.flatMap((instId) => [
        { instType: 'SPOT' as const, channel: 'ticker' as const, instId },
        { instType: 'SPOT' as const, channel: 'books' as const, instId },
        { instType: 'SPOT' as const, channel: 'books15' as const, instId },
        { instType: 'SPOT' as const, channel: 'candle1m' as const, instId },
      ]);

      const futArgs = futIds.flatMap((instId) => [
        { instType: 'USDT-FUTURES' as const, channel: 'ticker' as const, instId },
        { instType: 'USDT-FUTURES' as const, channel: 'books15' as const, instId },
        { instType: 'USDT-FUTURES' as const, channel: 'candle1m' as const, instId },
      ]);

      const payload = {
        op: 'subscribe',
        args: [...spotArgs, ...futArgs],
      };
      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      if (isCleanedUp) return;
      const raw = event.data?.toString() || '';
      if (raw === 'pong') return;

      try {
        const parsed = JSON.parse(raw) as BitgetWsMessage<BitgetWsTickerData | BitgetWsBookData | string[]>;
        if (parsed.event === 'error') {
          // Normal: Exchange sends error for channels not supported by this instrument
          return;
        }

        if (parsed.data && parsed.data.length > 0 && parsed.arg) {
          const { channel, instType: msgInstType, instId: msgInstId } = parsed.arg;

          if (channel === 'ticker') {
            const tickerData = parsed.data[0] as BitgetWsTickerData;
            const currentPrice = parseFloat(tickerData.lastPr);

            if (msgInstType === 'SPOT') {
              if (msgInstId === cleanSymbol || msgInstId === targetSpotInstId) {
                hasSpotRef.current = true;
                pendingUpdatesRef.current.spotTicker = tickerData;

                if (!isNaN(currentPrice)) {
                  if (prevSpotPriceRef.current !== null && currentPrice !== prevSpotPriceRef.current) {
                    const dir: TickDirection = currentPrice > prevSpotPriceRef.current ? 'up' : 'down';
                    pendingUpdatesRef.current.tickDirection = dir;

                    if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
                    tickTimerRef.current = setTimeout(() => {
                      if (!isCleanedUp) {
                        setTickDirection('neutral');
                      }
                    }, 600);
                  }
                  prevSpotPriceRef.current = currentPrice;
                }
              }
            } else if (msgInstType === 'USDT-FUTURES') {
              if (msgInstId === cleanSymbol || msgInstId === targetFuturesInstId) {
                pendingUpdatesRef.current.futuresTicker = tickerData;

                if (!isNaN(currentPrice)) {
                  // Only drive hero tick direction from futures if this instrument has no spot feed
                  if (!hasSpotRef.current) {
                    if (prevFuturesPriceRef.current !== null && currentPrice !== prevFuturesPriceRef.current) {
                      const dir: TickDirection = currentPrice > prevFuturesPriceRef.current ? 'up' : 'down';
                      pendingUpdatesRef.current.tickDirection = dir;

                      if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
                      tickTimerRef.current = setTimeout(() => {
                        if (!isCleanedUp) {
                          setTickDirection('neutral');
                        }
                      }, 600);
                    }
                  }
                  prevFuturesPriceRef.current = currentPrice;
                }
              }
            }
            scheduleFlush();
          } else if (channel === 'books15' || channel === 'books5' || channel === 'books') {
            const bookData = parsed.data[0] as BitgetWsBookData;
            const record = {
              symbol: cleanSymbol,
              data: {
                asks: (bookData.asks || []).slice(0, 8),
                bids: (bookData.bids || []).slice(0, 8),
                ts: bookData.ts,
              },
            };

            if (msgInstType === 'SPOT') {
              if (msgInstId === cleanSymbol || msgInstId === targetSpotInstId) {
                hasSpotOrderbookRef.current = true;
                pendingUpdatesRef.current.spotOrderbookRecord = record;
                scheduleFlush();
              }
            } else {
              if (msgInstId === cleanSymbol || msgInstId === targetFuturesInstId) {
                hasFuturesOrderbookRef.current = true;
                pendingUpdatesRef.current.futuresOrderbookRecord = record;
                scheduleFlush();
              }
            }
          } else if (channel === 'candle1m') {
            const isSpot = msgInstType === 'SPOT';
            const isMatch = isSpot
              ? (msgInstId === cleanSymbol || msgInstId === targetSpotInstId)
              : (msgInstId === cleanSymbol || msgInstId === targetFuturesInstId);

            if (!isMatch) return;
            const rawCandles = parsed.data as string[][];
            const candleRef = isSpot ? spotCandlesRef : futuresCandlesRef;

            if (parsed.action === 'snapshot') {
              const formatted: MicroCandle[] = rawCandles
                .map((row) => ({
                  timestamp: parseInt(row[0], 10),
                  close: parseFloat(row[4]),
                  high: parseFloat(row[2]),
                  low: parseFloat(row[3]),
                }))
                .slice(-30);
              candleRef.current = formatted;
              if (isSpot) {
                pendingUpdatesRef.current.spotCandlesRecord = { symbol: cleanSymbol, data: formatted };
              } else {
                pendingUpdatesRef.current.futuresCandlesRecord = { symbol: cleanSymbol, data: formatted };
              }
              scheduleFlush();
            } else if (rawCandles.length > 0) {
              const latest = rawCandles[0];
              const latestCandle: MicroCandle = {
                timestamp: parseInt(latest[0], 10),
                close: parseFloat(latest[4]),
                high: parseFloat(latest[2]),
                low: parseFloat(latest[3]),
              };

              const updated = [...candleRef.current];
              const lastIdx = updated.length - 1;
              if (lastIdx >= 0 && updated[lastIdx].timestamp === latestCandle.timestamp) {
                updated[lastIdx] = latestCandle;
              } else {
                updated.push(latestCandle);
              }
              candleRef.current = updated.slice(-30);
              if (isSpot) {
                pendingUpdatesRef.current.spotCandlesRecord = { symbol: cleanSymbol, data: candleRef.current };
              } else {
                pendingUpdatesRef.current.futuresCandlesRecord = { symbol: cleanSymbol, data: candleRef.current };
              }
              scheduleFlush();
            }
          }
        }
      } catch {
        // Ignore non-json frames
      }
    };

    ws.onerror = (err) => {
      if (isCleanedUp) return;
      setHasError(true);
      setIsConnected(false);
      console.error(`[Bitget WS] Connection failed (${cleanSymbol}):`, err);
    };

    ws.onclose = (event) => {
      if (isCleanedUp) return;
      setIsConnected(false);
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }

      const delay = Math.min(
        RECONNECT_BASE_DELAY_MS * Math.pow(1.5, retryCountRef.current),
        RECONNECT_MAX_DELAY_MS
      );
      retryCountRef.current += 1;

      console.warn(
        `[Bitget WS] Connection closed (${cleanSymbol}) [code: ${event.code}]. Reconnecting in ${delay}ms...`
      );

      reconnectTimer = setTimeout(() => {
        if (!isCleanedUp) {
          setReconnectTrigger((prev) => prev + 1);
        }
      }, delay);
    };

    return () => {
      isCleanedUp = true;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (pingTimer) clearInterval(pingTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (tickTimerRef.current) {
        clearTimeout(tickTimerRef.current);
        tickTimerRef.current = null;
      }
      setTickDirection('neutral');
      ws.close();
    };
  }, [cleanSymbol, targetSpotInstId, targetFuturesInstId, enabled, reconnectTrigger]);

  return {
    ticker: effectiveTicker,
    futuresTicker: activeFuturesTicker,
    orderbook: activeOrderbook,
    candles: activeCandles,
    status,
    tickDirection,
    marketType,
  };
}

