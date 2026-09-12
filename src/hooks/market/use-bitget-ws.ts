'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { BitgetWsTickerData, BitgetWsBookData, BitgetWsMessage } from '@/lib/bitget/types';
import { normalizeSymbol } from '@/lib/bitget/client';

export type WsConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type TickDirection = 'up' | 'down' | 'neutral';

export interface MicroCandle {
  timestamp: number;
  close: number;
  high: number;
  low: number;
}

export interface UseBitgetWebSocketOptions {
  symbol: string;
  instType: 'SPOT' | 'USDT-FUTURES';
  enabled?: boolean;
}

export interface UseBitgetWebSocketReturn {
  ticker: BitgetWsTickerData | null;
  orderbook: BitgetWsBookData | null;
  candles: MicroCandle[];
  status: WsConnectionStatus;
  tickDirection: TickDirection;
  reconnect: () => void;
}

const WS_URL = 'wss://ws.bitget.com/v2/ws/public';
const PING_INTERVAL_MS = 20000;
const RECONNECT_BASE_DELAY_MS = 1500;
const RECONNECT_MAX_DELAY_MS = 10000;

/**
 * High-performance browser WebSocket hook for Bitget v2 public market streams.
 * Subscribes to ticker, books15 (depth), and candle1m (micro trend) with resilient keepalive.
 */
export function useBitgetWebSocket({
  symbol,
  instType,
  enabled = true,
}: UseBitgetWebSocketOptions): UseBitgetWebSocketReturn {
  const [ticker, setTicker] = useState<BitgetWsTickerData | null>(null);
  const [orderbookRecord, setOrderbookRecord] = useState<{ symbol: string; data: BitgetWsBookData } | null>(null);
  const [candlesRecord, setCandlesRecord] = useState<{ symbol: string; data: MicroCandle[] } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [tickDirection, setTickDirection] = useState<TickDirection>('neutral');
  const [reconnectTrigger, setReconnectTrigger] = useState(0);

  const prevPriceRef = useRef<number | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

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
  const activeTicker = ticker?.instId === cleanSymbol ? ticker : null;
  const activeOrderbook = orderbookRecord?.symbol === cleanSymbol ? orderbookRecord.data : null;
  const activeCandles = candlesRecord?.symbol === cleanSymbol ? candlesRecord.data : [];

  const reconnect = useCallback(() => {
    setReconnectTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) {
      return;
    }

    let isCleanedUp = false;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    prevPriceRef.current = null;

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

      // Channel subscriptions: ticker, books15, candle1m
      const payload = {
        op: 'subscribe',
        args: [
          {
            instType,
            channel: 'ticker',
            instId: cleanSymbol,
          },
          {
            instType,
            channel: 'books15',
            instId: cleanSymbol,
          },
          {
            instType,
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
          console.warn('[Bitget WS] Subscription error:', parsed.msg);
          return;
        }

        if (parsed.data && parsed.data.length > 0 && parsed.arg) {
          const { channel } = parsed.arg;

          if (channel === 'ticker') {
            const tickerData = parsed.data[0] as BitgetWsTickerData;
            setTicker(tickerData);

            const currentPrice = parseFloat(tickerData.lastPr);
            if (!isNaN(currentPrice)) {
              if (prevPriceRef.current !== null) {
                if (currentPrice > prevPriceRef.current) {
                  setTickDirection('up');
                } else if (currentPrice < prevPriceRef.current) {
                  setTickDirection('down');
                }
                if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
                tickTimerRef.current = setTimeout(() => {
                  if (!isCleanedUp) {
                    setTickDirection('neutral');
                  }
                }, 600);
              }
              prevPriceRef.current = currentPrice;
            }
          } else if (channel === 'books15' || channel === 'books5' || channel === 'books') {
            const bookData = parsed.data[0] as BitgetWsBookData;
            setOrderbookRecord({
              symbol: cleanSymbol,
              data: {
                asks: (bookData.asks || []).slice(0, 8),
                bids: (bookData.bids || []).slice(0, 8),
                ts: bookData.ts,
              },
            });
          } else if (channel === 'candle1m') {
            const rawCandles = parsed.data as string[][];
            setCandlesRecord((prev) => {
              const prevList = prev?.symbol === cleanSymbol ? prev.data : [];
              if (parsed.action === 'snapshot') {
                const formatted: MicroCandle[] = rawCandles
                  .map((row) => ({
                    timestamp: parseInt(row[0], 10),
                    close: parseFloat(row[4]),
                    high: parseFloat(row[2]),
                    low: parseFloat(row[3]),
                  }))
                  .slice(-30);
                return { symbol: cleanSymbol, data: formatted };
              }

              // Update latest candle
              if (rawCandles.length > 0) {
                const latest = rawCandles[0];
                const latestCandle: MicroCandle = {
                  timestamp: parseInt(latest[0], 10),
                  close: parseFloat(latest[4]),
                  high: parseFloat(latest[2]),
                  low: parseFloat(latest[3]),
                };

                const updated = [...prevList];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].timestamp === latestCandle.timestamp) {
                  updated[lastIdx] = latestCandle;
                } else {
                  updated.push(latestCandle);
                }
                return { symbol: cleanSymbol, data: updated.slice(-30) };
              }
              return prev;
            });
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
      if (pingTimer) clearInterval(pingTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
      ws.close();
    };
  }, [cleanSymbol, instType, enabled, reconnectTrigger]);

  return {
    ticker: activeTicker,
    orderbook: activeOrderbook,
    candles: activeCandles,
    status,
    tickDirection,
    reconnect,
  };
}
