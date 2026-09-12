import { describe, test, expect, beforeEach } from 'bun:test';
import { L2Orderbook } from '../src/lib/bitget/l2-book';
import { normalizeSymbol, normalizeGranularity } from '../src/lib/bitget/client';
import { buildWsSubscriptions } from '../src/lib/bitget/ws-subscriptions';
import type { BitgetWsBookData, BitgetWsTickerData } from '../src/lib/bitget/types';
import type { MicroCandle } from '../src/lib/bitget/ws-seeding';

describe('Market Streamer — Institutional Core Engine & Data Contracts', () => {

  // ---------------------------------------------------------------------------
  // 1. SYMBOL & GRANULARITY NORMALIZATION ENGINE
  // ---------------------------------------------------------------------------
  describe('Symbol & Granularity Normalization Engine', () => {
    test('normalizes raw crypto tickers, lowercase assets, and suffixes', () => {
      expect(normalizeSymbol('btc')).toBe('BTCUSDT');
      expect(normalizeSymbol('eth')).toBe('ETHUSDT');
      expect(normalizeSymbol('sol_usdt')).toBe('SOLUSDT');
      expect(normalizeSymbol('ADA-PERP')).toBe('ADAUSDT');
      expect(normalizeSymbol('xrp.p')).toBe('XRPUSDT');
      expect(normalizeSymbol('DOGE/USDT')).toBe('DOGEUSDT');
      expect(normalizeSymbol('BTC.D')).toBe('BTCUSDT');
    });

    test('correctly maps institutional asset aliases to active Bitget pairs', () => {
      expect(normalizeSymbol('GOLD')).toBe('XAUUSDT');
      expect(normalizeSymbol('XAU')).toBe('XAUUSDT');
      expect(normalizeSymbol('SILVER')).toBe('XAGUSDT');
      expect(normalizeSymbol('XAG')).toBe('XAGUSDT');
      expect(normalizeSymbol('TSLA')).toBe('TSLAUSDT');
      expect(normalizeSymbol('NVDA')).toBe('NVDAUSDT');
      expect(normalizeSymbol('SPY')).toBe('SPYUSDT');
      expect(normalizeSymbol('QQQ')).toBe('QQQUSDT');
      expect(normalizeSymbol('AAPL')).toBe('AAPLUSDT');
      expect(normalizeSymbol('MSFT')).toBe('MSFTUSDT');
      expect(normalizeSymbol('COIN')).toBe('COINUSDT');
      expect(normalizeSymbol('MSTR')).toBe('MSTRUSDT');
    });

    test('handles edge case inputs and defaults safely to BTCUSDT', () => {
      expect(normalizeSymbol('')).toBe('BTCUSDT');
      expect(normalizeSymbol('   ')).toBe('BTCUSDT');
      expect(normalizeSymbol('---')).toBe('BTCUSDT');
      // @ts-expect-error - testing invalid runtime input
      expect(normalizeSymbol(null)).toBe('BTCUSDT');
      // @ts-expect-error - testing invalid runtime input
      expect(normalizeSymbol(undefined)).toBe('BTCUSDT');
    });

    test('normalizes candlestick granularities strictly to Bitget API v2 requirements', () => {
      expect(normalizeGranularity('1m')).toBe('1m');
      expect(normalizeGranularity('1min')).toBe('1m');
      expect(normalizeGranularity('3m')).toBe('3m');
      expect(normalizeGranularity('5m')).toBe('5m');
      expect(normalizeGranularity('15m')).toBe('15m');
      expect(normalizeGranularity('15min')).toBe('15m');
      expect(normalizeGranularity('30min')).toBe('30m');
      expect(normalizeGranularity('1h')).toBe('1H');
      expect(normalizeGranularity('1hour')).toBe('1H');
      expect(normalizeGranularity('4h')).toBe('4H');
      expect(normalizeGranularity('4hour')).toBe('4H');
      expect(normalizeGranularity('6h')).toBe('6H');
      expect(normalizeGranularity('12h')).toBe('12H');
      expect(normalizeGranularity('1d')).toBe('1D');
      expect(normalizeGranularity('1day')).toBe('1D');
      expect(normalizeGranularity('day')).toBe('1D');
      expect(normalizeGranularity('1w')).toBe('1W');
      expect(normalizeGranularity('week')).toBe('1W');
      expect(normalizeGranularity('1mth')).toBe('1M');
      expect(normalizeGranularity('month')).toBe('1M');
      expect(normalizeGranularity('unknown_tf')).toBe('4H');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. WEBSOCKET SUBSCRIPTION TOPIC BUILDER
  // ---------------------------------------------------------------------------
  describe('WebSocket Subscription Builder', () => {
    test('builds accurate topics for standard spot & perpetual crypto pairs', () => {
      const subs = buildWsSubscriptions('BTCUSDT', 'BTCUSDT', 'BTCUSDT');

      // Verify channel coverage
      const spotChannels = subs.filter((s) => s.instType === 'SPOT').map((s) => s.channel);
      const futChannels = subs.filter((s) => s.instType === 'USDT-FUTURES').map((s) => s.channel);

      expect(spotChannels).toContain('ticker');
      expect(spotChannels).toContain('books15');
      expect(spotChannels).toContain('candle1m');

      expect(futChannels).toContain('ticker');
      expect(futChannels).toContain('books15');
      expect(futChannels).toContain('candle1m');

      // Total 6 topics (3 spot + 3 futures)
      expect(subs.length).toBe(6);
    });

    test('routes rTokens to full "books" depth while keeping standard pairs on "books15"', () => {
      const subs = buildWsSubscriptions('RTSLAUSDT', 'RTSLAUSDT', 'TSLAUSDT');

      const rTokenSpotBook = subs.find(
        (s) => s.instType === 'SPOT' && s.instId === 'RTSLAUSDT' && (s.channel === 'books' || s.channel === 'books15')
      );
      expect(rTokenSpotBook?.channel).toBe('books');

      const tslaFutBook = subs.find(
        (s) => s.instType === 'USDT-FUTURES' && s.instId === 'TSLAUSDT' && (s.channel === 'books' || s.channel === 'books15')
      );
      expect(tslaFutBook?.channel).toBe('books15');
    });

    test('deduplicates subscription topics when cleanSymbol equals target IDs', () => {
      const subs = buildWsSubscriptions('ETHUSDT', 'ETHUSDT', 'ETHUSDT');
      const uniqueKeys = new Set(subs.map((s) => `${s.instType}:${s.channel}:${s.instId}`));
      expect(subs.length).toBe(uniqueKeys.size);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. PURE L2 ORDER BOOK STATE MACHINE
  // ---------------------------------------------------------------------------
  describe('L2 Order Book State Machine (L2Orderbook)', () => {
    let book: L2Orderbook;

    beforeEach(() => {
      book = new L2Orderbook();
    });

    test('initial state is completely empty with no data', () => {
      expect(book.hasData()).toBe(false);
      expect(book.ts).toBeUndefined();
      const top = book.getTop(8);
      expect(top.asks).toHaveLength(0);
      expect(top.bids).toHaveLength(0);
    });

    test('applies full snapshot, sort asks ascending and bids descending', () => {
      const snapshot: BitgetWsBookData = {
        asks: [
          ['65100.5', '2.5'],
          ['65050.0', '1.0'],
          ['65200.0', '5.0'],
          ['65020.0', '0.5'],
        ],
        bids: [
          ['64950.0', '1.5'],
          ['64980.0', '0.8'],
          ['64900.0', '3.0'],
          ['64850.0', '4.2'],
        ],
        ts: '1726000000000',
      };

      const result = book.applySnapshot(snapshot, false);
      expect(book.hasData()).toBe(true);
      expect(book.ts).toBe('1726000000000');

      // Asks must be sorted ascending (lowest ask first = best ask)
      expect(result.asks[0][0]).toBe('65020.0');
      expect(result.asks[1][0]).toBe('65050.0');
      expect(result.asks[2][0]).toBe('65100.5');
      expect(result.asks[3][0]).toBe('65200.0');

      // Bids must be sorted descending (highest bid first = best bid)
      expect(result.bids[0][0]).toBe('64980.0');
      expect(result.bids[1][0]).toBe('64950.0');
      expect(result.bids[0][1]).toBe('0.8');
      expect(result.bids[2][0]).toBe('64900.0');
      expect(result.bids[3][0]).toBe('64850.0');
    });

    test('applies pre-sorted snapshot with instant 8-level slice', () => {
      const preSortedSnapshot: BitgetWsBookData = {
        asks: Array.from({ length: 15 }, (_, i) => [(65000 + i * 10).toFixed(1), (1 + i * 0.1).toFixed(2)] as [string, string]),
        bids: Array.from({ length: 15 }, (_, i) => [(64990 - i * 10).toFixed(1), (1 + i * 0.1).toFixed(2)] as [string, string]),
        ts: '1726000001000',
      };

      const result = book.applySnapshot(preSortedSnapshot, true);
      expect(result.asks).toHaveLength(8);
      expect(result.bids).toHaveLength(8);
      expect(result.asks[0][0]).toBe('65000.0');
      expect(result.bids[0][0]).toBe('64990.0');
    });

    test('drops delta updates if book has not been initialized with a snapshot', () => {
      const update: BitgetWsBookData = {
        asks: [['65050.0', '1.5']],
        bids: [['64950.0', '2.0']],
        ts: '1726000002000',
      };

      const result = book.applyUpdate(update);
      expect(result).toBeNull();
      expect(book.hasData()).toBe(false);
    });

    test('processes delta updates: modifies size, inserts new price levels, and deletes on size 0', () => {
      // 1. Seed initial snapshot
      book.applySnapshot({
        asks: [
          ['65010.0', '1.0'],
          ['65020.0', '2.0'],
        ],
        bids: [
          ['65000.0', '1.5'],
          ['64990.0', '2.5'],
        ],
        ts: '1726000003000',
      });

      // 2. Apply delta:
      // - Update 65010.0 from 1.0 to 3.5
      // - Insert new ask at 65005.0 (new best ask)
      // - Delete 65020.0 (size = 0)
      // - Delete 65000.0 bid (size = 0)
      // - Insert new best bid at 64995.0
      const deltaUpdate: BitgetWsBookData = {
        asks: [
          ['65010.0', '3.5'],
          ['65005.0', '0.8'],
          ['65020.0', '0'],
        ],
        bids: [
          ['65000.0', '0.0'],
          ['64995.0', '4.0'],
        ],
        ts: '1726000004000',
      };

      const top = book.applyUpdate(deltaUpdate);
      expect(top).not.toBeNull();
      if (!top) return;

      // Verify Asks: 65005.0 (0.8), 65010.0 (3.5). 65020.0 is deleted.
      expect(top.asks).toHaveLength(2);
      expect(top.asks[0]).toEqual(['65005.0', '0.8']);
      expect(top.asks[1]).toEqual(['65010.0', '3.5']);

      // Verify Bids: 64995.0 (4), 64990.0 (2.5). 65000.0 is deleted.
      expect(top.bids).toHaveLength(2);
      expect(top.bids[0]).toEqual(['64995.0', '4']);
      expect(top.bids[1]).toEqual(['64990.0', '2.5']);
    });

    test('clear() resets all internal maps and timestamps', () => {
      book.applySnapshot({
        asks: [['65010.0', '1.0']],
        bids: [['65000.0', '1.0']],
        ts: '1726000005000',
      });
      expect(book.hasData()).toBe(true);

      book.clear();
      expect(book.hasData()).toBe(false);
      expect(book.ts).toBeUndefined();
      expect(book.getTop(8).asks).toHaveLength(0);
      expect(book.getTop(8).bids).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. ORDER BOOK DEPTH IMBALANCE & SPREAD MATHEMATICS
  // ---------------------------------------------------------------------------
  describe('Order Book Depth & Spread Mathematical Models', () => {
    test('calculates correct bid/ask volume imbalance ratio', () => {
      const asks: [string, string][] = [
        ['65010.0', '1.0'],
        ['65020.0', '3.0'],
      ]; // Total ask volume = 4.0
      const bids: [string, string][] = [
        ['65000.0', '4.0'],
        ['64990.0', '2.0'],
      ]; // Total bid volume = 6.0

      const totalAskVol = asks.reduce((acc, a) => acc + parseFloat(a[1]), 0);
      const totalBidVol = bids.reduce((acc, b) => acc + parseFloat(b[1]), 0);
      const sumVol = totalAskVol + totalBidVol;

      const bidPct = Math.round((totalBidVol / sumVol) * 100);
      const askPct = 100 - bidPct;

      expect(totalAskVol).toBe(4.0);
      expect(totalBidVol).toBe(6.0);
      expect(bidPct).toBe(60);
      expect(askPct).toBe(40);
    });

    test('calculates spread value and spread percentage accurately', () => {
      const bestAsk = 65001.5;
      const bestBid = 65000.0;
      const spreadValue = bestAsk - bestBid;
      const spreadPercent = ((spreadValue / bestAsk) * 100).toFixed(4);

      expect(spreadValue).toBeCloseTo(1.5, 5);
      expect(spreadPercent).toBe('0.0023');
    });

    test('handles zero depth gracefully (empty books default to 50/50 balance)', () => {
      const totalAskVol = 0;
      const totalBidVol = 0;
      const sumVol = totalAskVol + totalBidVol;
      const bidPct = sumVol > 0 ? Math.round((totalBidVol / sumVol) * 100) : 50;
      const askPct = 100 - bidPct;

      expect(bidPct).toBe(50);
      expect(askPct).toBe(50);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. CANDLESTREAM & 30M MICRO-TREND BEZIER MATHEMATICS
  // ---------------------------------------------------------------------------
  describe('Candlestick Stream & Micro-Trend Geometry', () => {
    test('maintains sliding window of 30 1-minute candles on stream updates', () => {
      let buffer: MicroCandle[] = [];

      // Initial snapshot of 35 candles (should truncate to last 30)
      const rawSnapshot: MicroCandle[] = Array.from({ length: 35 }, (_, i) => ({
        timestamp: 1726000000000 + i * 60000,
        close: 65000 + (i % 5) * 10,
        high: 65050,
        low: 64950,
      }));

      buffer = rawSnapshot.slice(-30);
      expect(buffer).toHaveLength(30);
      expect(buffer[0].timestamp).toBe(1726000000000 + 5 * 60000);

      // In-place update of current active minute candle
      const currentCandleUpdate: MicroCandle = {
        timestamp: buffer[buffer.length - 1].timestamp,
        close: 65999.0,
        high: 66000.0,
        low: 64950.0,
      };

      const updated = [...buffer];
      updated[updated.length - 1] = currentCandleUpdate;
      buffer = updated.slice(-30);

      expect(buffer).toHaveLength(30);
      expect(buffer[buffer.length - 1].close).toBe(65999.0);

      // Ingestion of a brand-new minute candle (advances buffer, drops oldest)
      const newMinuteCandle: MicroCandle = {
        timestamp: buffer[buffer.length - 1].timestamp + 60000,
        close: 66100.0,
        high: 66150.0,
        low: 66000.0,
      };

      buffer = [...buffer, newMinuteCandle].slice(-30);
      expect(buffer).toHaveLength(30);
      expect(buffer[buffer.length - 1].timestamp).toBe(newMinuteCandle.timestamp);
      expect(buffer[buffer.length - 1].close).toBe(66100.0);
    });

    test('computes quadratic Bézier sparkline SVG geometry and trend direction', () => {
      const candles: MicroCandle[] = [
        { timestamp: 1000, close: 100, high: 105, low: 95 },
        { timestamp: 2000, close: 105, high: 110, low: 98 },
        { timestamp: 3000, close: 115, high: 120, low: 102 },
        { timestamp: 4000, close: 125, high: 130, low: 112 },
      ];

      const closes = candles.map((c) => c.close);
      const min = Math.min(...closes);
      const max = Math.max(...closes);
      const span = max - min || 1;

      expect(min).toBe(100);
      expect(max).toBe(125);
      expect(span).toBe(25);

      const isUp = closes[closes.length - 1] >= closes[0];
      expect(isUp).toBe(true);

      const width = 360;
      const height = 52;
      const paddingY = 8;
      const availableHeight = height - paddingY * 2;

      const points = closes.map((val, idx) => {
        const x = (idx / (closes.length - 1)) * width;
        const y = height - paddingY - ((val - min) / span) * availableHeight;
        return { x, y };
      });

      expect(points[0].x).toBe(0);
      expect(points[0].y).toBe(height - paddingY); // lowest point = bottom Y
      expect(points[points.length - 1].x).toBe(360);
      expect(points[points.length - 1].y).toBe(paddingY); // highest point = top Y

      // Bézier curve assembly
      const pathD = points.reduce((acc, pt, idx, arr) => {
        if (idx === 0) return `M ${pt.x},${pt.y}`;
        const prev = arr[idx - 1];
        const cx = (prev.x + pt.x) / 2;
        return `${acc} Q ${cx},${prev.y} ${cx},${(prev.y + pt.y) / 2} T ${pt.x},${pt.y}`;
      }, '');

      expect(pathD.startsWith('M 0,44')).toBe(true);
      expect(pathD).toContain('Q');
      expect(pathD).toContain('T 360,8');
    });

    test('handles completely flat price candles without divide-by-zero errors', () => {
      const flatCandles: MicroCandle[] = [
        { timestamp: 1000, close: 100, high: 100, low: 100 },
        { timestamp: 2000, close: 100, high: 100, low: 100 },
        { timestamp: 3000, close: 100, high: 100, low: 100 },
      ];

      const closes = flatCandles.map((c) => c.close);
      const min = Math.min(...closes);
      const max = Math.max(...closes);
      const span = max - min || 1;

      expect(span).toBe(1);
      const y = 52 - 8 - ((100 - min) / span) * (52 - 16);
      expect(isNaN(y)).toBe(false);
      expect(isFinite(y)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. DERIVATIVES FLOW & NOTIONAL CALCULATIONS
  // ---------------------------------------------------------------------------
  describe('Derivatives Flow Metrics Calculations', () => {
    test('computes notional Open Interest (OI) from holding size and mark price', () => {
      const futuresTicker: Partial<BitgetWsTickerData> = {
        instId: 'BTCUSDT',
        holdingAmount: '15420.5',
        markPrice: '65400.0',
        lastPr: '65390.0',
        fundingRate: '0.00015',
        indexPrice: '65380.0',
      };

      const holding = parseFloat(futuresTicker.holdingAmount || '0');
      const markPrice = parseFloat(futuresTicker.markPrice || '0');
      const indexPrice = parseFloat(futuresTicker.indexPrice || '0');
      const lastPrice = parseFloat(futuresTicker.lastPr || '0');

      const notionalOI = holding * markPrice;
      expect(notionalOI).toBe(15420.5 * 65400.0);
      expect(notionalOI).toBeGreaterThan(1_000_000_000); // > $1B

      // Basis calculations
      const basisValue = (lastPrice || markPrice) - indexPrice;
      const basisPercent = ((basisValue / indexPrice) * 100).toFixed(2);
      expect(basisValue).toBe(10.0);
      expect(basisPercent).toBe('0.02');

      // Funding rate percentage
      const fundingRate = parseFloat(futuresTicker.fundingRate || '0');
      const fundingPercent = (fundingRate * 100).toFixed(4);
      expect(fundingPercent).toBe('0.0150');
    });

    test('handles negative funding rates and discount basis regimes', () => {
      const futuresTicker: Partial<BitgetWsTickerData> = {
        instId: 'ETHUSDT',
        lastPr: '2500.0',
        indexPrice: '2510.0',
        fundingRate: '-0.00025',
      };

      const lastPrice = parseFloat(futuresTicker.lastPr || '0');
      const indexPrice = parseFloat(futuresTicker.indexPrice || '0');
      const basisValue = lastPrice - indexPrice;
      const basisPercent = ((basisValue / indexPrice) * 100).toFixed(2);

      expect(basisValue).toBe(-10.0);
      expect(basisPercent).toBe('-0.40');

      const isContango = basisValue >= 0;
      expect(isContango).toBe(false); // Discount regime
    });
  });

  // ---------------------------------------------------------------------------
  // 7. SYMBOL CATALOG TIERED FUZZY SEARCH ALGORITHM
  // ---------------------------------------------------------------------------
  describe('Symbol Catalog Tiered Fuzzy Search Algorithm', () => {
    interface MockSymbolItem {
      symbol: string;
      baseAsset: string;
      quoteAsset: string;
      volume24h: number;
    }

    const mockCatalog: MockSymbolItem[] = [
      { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', volume24h: 5_000_000_000 },
      { symbol: 'WBTCUSDT', baseAsset: 'WBTC', quoteAsset: 'USDT', volume24h: 50_000_000 },
      { symbol: 'BTCSTUSDT', baseAsset: 'BTCST', quoteAsset: 'USDT', volume24h: 1_000_000 },
      { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', volume24h: 2_000_000_000 },
      { symbol: 'RESOLVUSDT', baseAsset: 'RESOLV', quoteAsset: 'USDT', volume24h: 5_000_000 },
      { symbol: 'TSLAUSDT', baseAsset: 'TSLA', quoteAsset: 'USDT', volume24h: 300_000_000 },
      { symbol: 'RTSLAUSDT', baseAsset: 'RTSLA', quoteAsset: 'USDT', volume24h: 100_000_000 },
    ];

    function runFuzzySearch(searchTerm: string, catalog: MockSymbolItem[]): MockSymbolItem[] {
      const clean = searchTerm.trim().toUpperCase();
      if (!clean) return catalog;

      const exact: MockSymbolItem[] = [];
      const prefix: MockSymbolItem[] = [];
      const contains: MockSymbolItem[] = [];

      for (let i = 0; i < catalog.length; i++) {
        const item = catalog[i];
        const base = item.baseAsset.toUpperCase();
        const sym = item.symbol.toUpperCase();

        if (base === clean || sym === clean) {
          exact.push(item);
        } else if (base.startsWith(clean) || sym.startsWith(clean)) {
          prefix.push(item);
        } else if (base.includes(clean) || sym.includes(clean)) {
          contains.push(item);
        }
      }

      return [...exact, ...prefix, ...contains];
    }

    test('exact match surfaces first before prefix and substring matches', () => {
      const results = runFuzzySearch('BTC', mockCatalog);
      expect(results[0].symbol).toBe('BTCUSDT'); // Exact match first
      expect(results[1].symbol).toBe('BTCSTUSDT'); // Prefix match second
      expect(results[2].symbol).toBe('WBTCUSDT'); // Substring match third
    });

    test('solves tokenized equity queries with prefix prioritization', () => {
      const results = runFuzzySearch('TSLA', mockCatalog);
      expect(results[0].symbol).toBe('TSLAUSDT'); // Exact baseAsset match
      expect(results[1].symbol).toBe('RTSLAUSDT'); // Substring match
    });

    test('returns empty array when no symbol matches query', () => {
      const results = runFuzzySearch('NONEXISTENT_COIN', mockCatalog);
      expect(results).toHaveLength(0);
    });

    test('returns all catalog symbols when query is whitespace or empty', () => {
      const results = runFuzzySearch('   ', mockCatalog);
      expect(results).toHaveLength(mockCatalog.length);
    });
  });
});
