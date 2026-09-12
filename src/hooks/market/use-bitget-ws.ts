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

  const prevPriceRef = useRef<number | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const spotCandlesRef = useRef<MicroCandle[]>([]);
  const futuresCandlesRef = useRef<MicroCandle[]>([]);

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

  // Derive status during render
  const status: WsConnectionStatus = !enabled
    ? 'disconnected'
    : isConnected
    ? 'connected'
    : hasError
    ? 'error'
    : 'connecting';

  // Derive active data during render
  const activeSpotTicker = spotTicker?.instId === cleanSymbol ? spotTicker : null;
  const activeFuturesTicker = futuresTicker?.instId === cleanSymbol ? futuresTicker : null;
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

    prevPriceRef.current = null;
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

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      if (isCleanedUp) return;
      setIsConnected(true);
      setHasError(false);
      retryCountRef.current = 0;

      // Keepalive heartbeat
      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, PING_INTERVAL_MS);

      // Channel subscriptions: Subscribe to both SPOT and USDT-FUTURES channels
      const payload = {
        op: 'subscribe',
        args: [
          {
            instType: 'SPOT' as const,
            channel: 'ticker',
            instId: cleanSymbol,
          },
          {
            instType: 'SPOT' as const,
            channel: 'books15',
            instId: cleanSymbol,
          },
          {
            instType: 'SPOT' as const,
            channel: 'candle1m',
            instId: cleanSymbol,
          },
          {
            instType: 'USDT-FUTURES' as const,
            channel: 'ticker',
            instId: cleanSymbol,
          },
          {
            instType: 'USDT-FUTURES' as const,
            channel: 'books15',
            instId: cleanSymbol,
          },
          {
            instType: 'USDT-FUTURES' as const,
            channel: 'candle1m',
            instId: cleanSymbol,
          },
        ],
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
          const { channel, instType: msgInstType } = parsed.arg;

          if (channel === 'ticker') {
            const tickerData = parsed.data[0] as BitgetWsTickerData;

            if (msgInstType === 'USDT-FUTURES') {
              pendingUpdatesRef.current.futuresTicker = tickerData;
            } else if (msgInstType === 'SPOT') {
              pendingUpdatesRef.current.spotTicker = tickerData;
            }

            const currentPrice = parseFloat(tickerData.lastPr);
            if (!isNaN(currentPrice)) {
              if (prevPriceRef.current !== null) {
                let dir: TickDirection = 'neutral';
                if (currentPrice > prevPriceRef.current) {
                  dir = 'up';
                } else if (currentPrice < prevPriceRef.current) {
                  dir = 'down';
                }
                pendingUpdatesRef.current.tickDirection = dir;

                if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
                tickTimerRef.current = setTimeout(() => {
                  if (!isCleanedUp) {
                    setTickDirection('neutral');
                  }
                }, 600);
              }
              prevPriceRef.current = currentPrice;
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
              pendingUpdatesRef.current.spotOrderbookRecord = record;
            } else {
              pendingUpdatesRef.current.futuresOrderbookRecord = record;
            }
            scheduleFlush();
          } else if (channel === 'candle1m') {
            const rawCandles = parsed.data as string[][];
            const isSpot = msgInstType === 'SPOT';
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

    ws.onerror = () => {
      if (isCleanedUp) return;
      setHasError(true);
      setIsConnected(false);
    };

    ws.onclose = () => {
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
      if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
      ws.close();
    };
  }, [cleanSymbol, enabled, reconnectTrigger]);

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

