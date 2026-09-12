'use client';

import { useState, useEffect, useRef } from 'react';
import type { BitgetWsTickerData, BitgetWsBookData, BitgetWsMessage } from '@/lib/bitget/types';
import {
  normalizeSymbol,
  L2Orderbook,
  seedCandlesSnapshot,
  seedOrderbookSnapshot,
  buildWsSubscriptions,
  isRTokenSymbol,
  type MicroCandle,
} from '@/lib/bitget';

export type WsConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type TickDirection = 'up' | 'down' | 'neutral';
export type MarketType = 'spot' | 'futures' | 'both';
export type { MicroCandle };

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

export interface MarketStreamState extends UseBitgetWebSocketReturn {
  symbol: string;
  isConnecting: boolean;
}

const WS_URL = 'wss://ws.bitget.com/v3/ws/public';
const PING_INTERVAL_MS = 20000;
const RECONNECT_BASE_DELAY_MS = 1500;
const RECONNECT_MAX_DELAY_MS = 10000;

/**
 * High-performance browser WebSocket hook for Bitget V3 UTA public market streams.
 * Subscribes to spot and usdt-futures ticker, depth books, and 1m candles.
 * Seamlessly adapts when an instrument is Spot-only, Futures-only, or Dual-market.
 */
export function useBitgetWebSocket({
  symbol,
  enabled = true,
}: UseBitgetWebSocketOptions): UseBitgetWebSocketReturn {
  const [spotTicker, setSpotTicker] = useState<BitgetWsTickerData | null>(null);
  const [futuresTicker, setFuturesTicker] = useState<BitgetWsTickerData | null>(null);
  const [spotBook, setSpotBook] = useState<{ symbol: string; data: BitgetWsBookData } | null>(null);
  const [futuresBook, setFuturesBook] = useState<{ symbol: string; data: BitgetWsBookData } | null>(null);
  const [spotCandles, setSpotCandles] = useState<{ symbol: string; data: MicroCandle[] } | null>(null);
  const [futuresCandles, setFuturesCandles] = useState<{ symbol: string; data: MicroCandle[] } | null>(null);
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

  const spotL2BookRef = useRef(new L2Orderbook());
  const futuresL2BookRef = useRef(new L2Orderbook());

  // RAF update batching buffer
  const pendingUpdatesRef = useRef<{
    spotTicker?: BitgetWsTickerData;
    futuresTicker?: BitgetWsTickerData;
    spotBook?: { symbol: string; data: BitgetWsBookData };
    futuresBook?: { symbol: string; data: BitgetWsBookData };
    spotCandles?: { symbol: string; data: MicroCandle[] };
    futuresCandles?: { symbol: string; data: MicroCandle[] };
    tickDirection?: TickDirection;
  }>({});
  const rafIdRef = useRef<number | null>(null);

  const cleanSymbol = normalizeSymbol(symbol);
  const isEquity = isRTokenSymbol(cleanSymbol) || cleanSymbol.startsWith('R');
  const targetSpotInstId = isEquity
    ? (cleanSymbol.startsWith('R') ? cleanSymbol : `R${cleanSymbol}`)
    : cleanSymbol;
  const targetFuturesInstId = isEquity
    ? (cleanSymbol.startsWith('R') ? cleanSymbol.slice(1) : cleanSymbol)
    : cleanSymbol;

  // Derived status & active data
  const status: WsConnectionStatus = !enabled
    ? 'disconnected'
    : isConnected
    ? 'connected'
    : hasError
    ? 'error'
    : 'connecting';

  const activeSpotTicker =
    spotTicker && (spotTicker.instId === cleanSymbol || spotTicker.symbol === cleanSymbol || spotTicker.instId === targetSpotInstId || spotTicker.symbol === targetSpotInstId)
      ? spotTicker
      : null;
  const activeFuturesTicker =
    futuresTicker && (futuresTicker.instId === cleanSymbol || futuresTicker.symbol === cleanSymbol || futuresTicker.instId === targetFuturesInstId || futuresTicker.symbol === targetFuturesInstId)
      ? futuresTicker
      : null;

  const effectiveTicker = activeSpotTicker || activeFuturesTicker;

  const marketType: MarketType =
    activeSpotTicker && activeFuturesTicker
      ? 'both'
      : activeFuturesTicker && !activeSpotTicker
      ? 'futures'
      : 'spot';

  const activeOrderbook =
    spotBook?.symbol === cleanSymbol
      ? spotBook.data
      : futuresBook?.symbol === cleanSymbol
      ? futuresBook.data
      : null;

  const activeCandles =
    spotCandles?.symbol === cleanSymbol && spotCandles.data.length > 0
      ? spotCandles.data
      : futuresCandles?.symbol === cleanSymbol
      ? futuresCandles.data
      : [];

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) {
      return;
    }

    let ws: WebSocket | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isCleanedUp = false;
    let isMounted = true;

    prevSpotPriceRef.current = null;
    prevFuturesPriceRef.current = null;
    hasSpotRef.current = false;
    spotL2BookRef.current.clear();
    futuresL2BookRef.current.clear();
    spotCandlesRef.current = [];
    futuresCandlesRef.current = [];
    pendingUpdatesRef.current = {};

    const flushUpdates = () => {
      if (isCleanedUp) return;
      const pending = pendingUpdatesRef.current;
      if (pending.spotTicker !== undefined) setSpotTicker(pending.spotTicker);
      if (pending.futuresTicker !== undefined) setFuturesTicker(pending.futuresTicker);
      if (pending.spotBook !== undefined) setSpotBook(pending.spotBook);
      if (pending.futuresBook !== undefined) setFuturesBook(pending.futuresBook);
      if (pending.spotCandles !== undefined) setSpotCandles(pending.spotCandles);
      if (pending.futuresCandles !== undefined) setFuturesCandles(pending.futuresCandles);
      if (pending.tickDirection !== undefined) setTickDirection(pending.tickDirection);
      pendingUpdatesRef.current = {};
      rafIdRef.current = null;
    };

    const scheduleFlush = () => {
      if (rafIdRef.current === null && !isCleanedUp) {
        rafIdRef.current = requestAnimationFrame(flushUpdates);
      }
    };

    // Cold-start REST seeding
    seedCandlesSnapshot(cleanSymbol, targetSpotInstId, targetFuturesInstId).then((candles) => {
      if (!isMounted || candles.length === 0) return;
      if (spotCandlesRef.current.length === 0 && futuresCandlesRef.current.length === 0) {
        spotCandlesRef.current = candles;
        pendingUpdatesRef.current.spotCandles = { symbol: cleanSymbol, data: candles };
        scheduleFlush();
      }
    });

    seedOrderbookSnapshot(cleanSymbol, targetSpotInstId, targetFuturesInstId).then((book) => {
      if (!isMounted || !book) return;
      if (!spotL2BookRef.current.hasData()) {
        const topLevels = spotL2BookRef.current.applySnapshot(book, true);
        pendingUpdatesRef.current.spotBook = {
          symbol: cleanSymbol,
          data: { ...topLevels, ts: book.ts },
        };
        scheduleFlush();
      }
    });

    try {
      ws = new WebSocket(WS_URL);
    } catch {
      setTimeout(() => {
        if (!isCleanedUp) setHasError(true);
      }, 0);
      return;
    }


    ws.onopen = () => {
      if (isCleanedUp) return;
      setIsConnected(true);
      setHasError(false);
      retryCountRef.current = 0;

      pingTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) ws.send('ping');
      }, PING_INTERVAL_MS);

      const args = buildWsSubscriptions(cleanSymbol, targetSpotInstId, targetFuturesInstId);
      ws.send(JSON.stringify({ op: 'subscribe', args }));
    };

    ws.onmessage = (event) => {
      if (isCleanedUp) return;
      const raw = event.data?.toString() || '';
      if (raw === 'pong') return;

      try {
        const parsed = JSON.parse(raw) as BitgetWsMessage<BitgetWsTickerData | BitgetWsBookData | string[]>;
        if (parsed.event === 'error' || !parsed.data || parsed.data.length === 0 || !parsed.arg) {
          return;
        }

        const topic = parsed.arg.topic || parsed.arg.channel;
        const msgInstType = (parsed.arg.instType || '').toUpperCase();
        const msgInstId = parsed.arg.symbol || parsed.arg.instId || '';

        const isSpot = msgInstType === 'SPOT';
        const isMatch = isSpot
          ? msgInstId === cleanSymbol || msgInstId === targetSpotInstId
          : msgInstId === cleanSymbol || msgInstId === targetFuturesInstId;

        if (!isMatch) return;

        // 1. Ticker Message
        if (topic === 'ticker') {
          const rawTicker = parsed.data[0] as BitgetWsTickerData;
          const normalizedTicker: BitgetWsTickerData = {
            ...rawTicker,
            instId: rawTicker.symbol || rawTicker.instId || msgInstId,
            symbol: rawTicker.symbol || rawTicker.instId || msgInstId,
            lastPr: rawTicker.lastPrice || rawTicker.lastPr || '0',
            high24h: rawTicker.highPrice24h || rawTicker.high24h || '0',
            low24h: rawTicker.lowPrice24h || rawTicker.low24h || '0',
            change24h: rawTicker.price24hPcnt || rawTicker.change24h || '0',
            quoteVolume: rawTicker.turnover24h || rawTicker.quoteVolume || '0',
            baseVolume: rawTicker.volume24h || rawTicker.baseVolume || '0',
            fundingRate: rawTicker.fundingRate,
            markPrice: rawTicker.markPrice,
            openInterest: rawTicker.openInterest || rawTicker.holdingAmount,
          };

          const currentPrice = parseFloat(normalizedTicker.lastPr || '0');

          if (isSpot) {
            hasSpotRef.current = true;
            pendingUpdatesRef.current.spotTicker = normalizedTicker;
          } else {
            pendingUpdatesRef.current.futuresTicker = normalizedTicker;
          }

          // Evaluate tick direction
          const prevPriceRef = isSpot ? prevSpotPriceRef : prevFuturesPriceRef;
          if (!isNaN(currentPrice) && (isSpot || !hasSpotRef.current)) {
            if (prevPriceRef.current !== null && currentPrice !== prevPriceRef.current) {
              const dir: TickDirection = currentPrice > prevPriceRef.current ? 'up' : 'down';
              pendingUpdatesRef.current.tickDirection = dir;

              if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
              tickTimerRef.current = setTimeout(() => {
                if (!isCleanedUp) setTickDirection('neutral');
              }, 600);
            }
            prevPriceRef.current = currentPrice;
          }
          scheduleFlush();
        }

        // 2. Order Book Depth Message
        else if (topic === 'books15' || topic === 'books5' || topic === 'books') {
          const rawBook = parsed.data[0] as BitgetWsBookData;
          if (!rawBook) return;

          const normalizedBook: BitgetWsBookData = {
            asks: rawBook.a || rawBook.asks || [],
            bids: rawBook.b || rawBook.bids || [],
            ts: rawBook.ts,
          };

          const l2Book = isSpot ? spotL2BookRef.current : futuresL2BookRef.current;
          const action = parsed.action || (topic === 'books15' || topic === 'books5' ? 'snapshot' : 'update');
          const isPreSorted = topic === 'books15' || topic === 'books5';

          const topLevels =
            action === 'snapshot'
              ? l2Book.applySnapshot(normalizedBook, isPreSorted)
              : l2Book.applyUpdate(normalizedBook);

          if (topLevels && (topLevels.asks.length > 0 || topLevels.bids.length > 0)) {
            const record = {
              symbol: cleanSymbol,
              data: { ...topLevels, ts: normalizedBook.ts },
            };
            if (isSpot) {
              pendingUpdatesRef.current.spotBook = record;
            } else {
              pendingUpdatesRef.current.futuresBook = record;
            }
            scheduleFlush();
          }
        }

        // 3. 1-Minute Candle Message
        else if (topic === 'candle1m') {
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
          }

          const record = { symbol: cleanSymbol, data: candleRef.current };
          if (isSpot) {
            pendingUpdatesRef.current.spotCandles = record;
          } else {
            pendingUpdatesRef.current.futuresCandles = record;
          }
          scheduleFlush();
        }
      } catch {
        // Ignore malformed frames
      }
    };

    ws.onerror = (err) => {
      if (isCleanedUp) return;
      setHasError(true);
      setIsConnected(false);
      console.error(`[Bitget WS] Connection failed (${cleanSymbol}):`, err);
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
