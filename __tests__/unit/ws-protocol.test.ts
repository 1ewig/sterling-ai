import { describe, test, expect } from 'bun:test';
import {
  normalizeWsTicker,
  normalizeWsOrderbook,
  updateCandlesSlidingWindow,
  isWsInstrumentMatch,
} from '@/lib/bitget';
import type { BitgetWsTickerData, BitgetWsBookData, MicroCandle } from '@/lib/bitget';

describe('WebSocket Protocol & Frame Normalizer Suite', () => {
  describe('normalizeWsTicker', () => {
    test('normalizes raw futures ticker fields with fallback identifier', () => {
      const raw: Partial<BitgetWsTickerData> = {
        lastPrice: '64500.5',
        highPrice24h: '65200.0',
        lowPrice24h: '63800.0',
        price24hPcnt: '0.0125',
        turnover24h: '500000000',
        volume24h: '7750',
        fundingRate: '0.0001',
        markPrice: '64510.0',
        holdingAmount: '12000',
      };

      const normalized = normalizeWsTicker(raw, 'BTCUSDT');
      expect(normalized.symbol).toBe('BTCUSDT');
      expect(normalized.instId).toBe('BTCUSDT');
      expect(normalized.lastPr).toBe('64500.5');
      expect(normalized.high24h).toBe('65200.0');
      expect(normalized.low24h).toBe('63800.0');
      expect(normalized.change24h).toBe('0.0125');
      expect(normalized.quoteVolume).toBe('500000000');
      expect(normalized.baseVolume).toBe('7750');
      expect(normalized.fundingRate).toBe('0.0001');
      expect(normalized.markPrice).toBe('64510.0');
      expect(normalized.openInterest).toBe('12000');
    });

    test('preserves existing symbol or instId when present', () => {
      const raw: Partial<BitgetWsTickerData> = {
        instId: 'SOLUSDT',
        lastPr: '145.2',
      };
      const normalized = normalizeWsTicker(raw, 'FALLBACK');
      expect(normalized.symbol).toBe('SOLUSDT');
      expect(normalized.instId).toBe('SOLUSDT');
      expect(normalized.lastPr).toBe('145.2');
    });
  });

  describe('normalizeWsOrderbook', () => {
    test('unwraps a/b and asks/bids formats consistently', () => {
      const rawAb: Partial<BitgetWsBookData> = {
        a: [['100', '1.5']],
        b: [['99', '2.0']],
        ts: '1726000000',
      };
      const normAb = normalizeWsOrderbook(rawAb);
      expect(normAb.asks).toEqual([['100', '1.5']]);
      expect(normAb.bids).toEqual([['99', '2.0']]);

      const rawAsksBids: BitgetWsBookData = {
        asks: [['105', '3.0']],
        bids: [['95', '4.0']],
        ts: '1726000001',
      };
      const normAsksBids = normalizeWsOrderbook(rawAsksBids);
      expect(normAsksBids.asks).toEqual([['105', '3.0']]);
      expect(normAsksBids.bids).toEqual([['95', '4.0']]);
    });
  });

  describe('updateCandlesSlidingWindow', () => {
    test('initializes from snapshot and caps to maxWindow', () => {
      const rawSnapshot: string[][] = Array.from({ length: 40 }, (_, i) => [
        String(1000 + i * 60000),
        '100',
        '105',
        '95',
        String(100 + i),
      ]);

      const result = updateCandlesSlidingWindow([], rawSnapshot, true, 30);
      expect(result).toHaveLength(30);
      expect(result[result.length - 1].close).toBe(139);
    });

    test('updates active minute candle in place', () => {
      const initial: MicroCandle[] = [
        { timestamp: 60000, close: 100, high: 105, low: 95 },
        { timestamp: 120000, close: 102, high: 106, low: 100 },
      ];

      const updateRow: string[][] = [['120000', '100', '108', '100', '107']];
      const result = updateCandlesSlidingWindow(initial, updateRow, false, 30);

      expect(result).toHaveLength(2);
      expect(result[1].timestamp).toBe(120000);
      expect(result[1].close).toBe(107);
      expect(result[1].high).toBe(108);
    });

    test('appends new minute candle and shifts window when full', () => {
      const initial: MicroCandle[] = Array.from({ length: 30 }, (_, i) => ({
        timestamp: (i + 1) * 60000,
        close: 100 + i,
        high: 105 + i,
        low: 95 + i,
      }));

      const newCandleRow: string[][] = [['1860000', '130', '135', '128', '133']];
      const result = updateCandlesSlidingWindow(initial, newCandleRow, false, 30);

      expect(result).toHaveLength(30);
      expect(result[0].timestamp).toBe(2 * 60000); // Shifted
      expect(result[29].timestamp).toBe(1860000);
      expect(result[29].close).toBe(133);
    });
  });

  describe('isWsInstrumentMatch', () => {
    test('matches standard crypto pairs accurately', () => {
      expect(isWsInstrumentMatch('BTCUSDT', true, 'BTCUSDT', 'BTCUSDT', 'BTCUSDT')).toBe(true);
      expect(isWsInstrumentMatch('BTCUSDT', false, 'BTCUSDT', 'BTCUSDT', 'BTCUSDT')).toBe(true);
      expect(isWsInstrumentMatch('ETHUSDT', true, 'BTCUSDT', 'BTCUSDT', 'BTCUSDT')).toBe(false);
    });

    test('resolves tokenized equity synthetic aliases for spot and perp', () => {
      // For RTSLAUSDT: cleanSymbol is RTSLAUSDT, targetSpotInstId is RTSLAUSDT, targetFuturesInstId is TSLAUSDT
      expect(isWsInstrumentMatch('RTSLAUSDT', true, 'RTSLAUSDT', 'RTSLAUSDT', 'TSLAUSDT')).toBe(true);
      expect(isWsInstrumentMatch('TSLAUSDT', false, 'RTSLAUSDT', 'RTSLAUSDT', 'TSLAUSDT')).toBe(true);
      expect(isWsInstrumentMatch('TSLAUSDT', true, 'RTSLAUSDT', 'RTSLAUSDT', 'TSLAUSDT')).toBe(false);
    });
  });
});
