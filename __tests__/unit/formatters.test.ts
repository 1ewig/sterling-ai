import { describe, test, expect } from 'bun:test';
import {
  formatMarketPrice,
  formatMarketVolume,
  formatSpread,
  formatBookSize,
  parseAssetPair,
  isRTokenSymbol,
  normalizeSymbol,
  normalizeGranularity,
} from '@/lib/bitget';

describe('Market Formatters & Normalization Suite', () => {
  describe('Symbol & Granularity Normalization', () => {
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

    test('normalizes candlestick granularities strictly to Bitget API V3 requirements', () => {
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

  describe('Centralized Price Formatting (formatMarketPrice)', () => {
    test('formats institutional high-value assets with thousands separators and 2 decimals', () => {
      expect(formatMarketPrice(65432.1)).toBe('65,432.10');
      expect(formatMarketPrice(1000.0)).toBe('1,000.00');
      expect(formatMarketPrice(1234567.89)).toBe('1,234,567.89');
    });

    test('formats standard dollar-range assets with 4 decimals', () => {
      expect(formatMarketPrice(142.5)).toBe('142.5000');
      expect(formatMarketPrice(1.002)).toBe('1.0020');
      expect(formatMarketPrice(999.99)).toBe('999.9900');
    });

    test('formats sub-dollar tokens with 5 decimals', () => {
      expect(formatMarketPrice(0.4567)).toBe('0.45670');
      expect(formatMarketPrice(0.0123)).toBe('0.01230');
    });

    test('formats micro-cap / meme tokens with 6 to 8 decimals', () => {
      expect(formatMarketPrice(0.000456)).toBe('0.000456');
      expect(formatMarketPrice(0.00001234)).toBe('0.00001234');
      expect(formatMarketPrice(0.00000078)).toBe('0.00000078');
    });

    test('handles zero and non-finite numbers safely', () => {
      expect(formatMarketPrice(0)).toBe('0.00');
      expect(formatMarketPrice(NaN)).toBe('0.00');
      expect(formatMarketPrice(Infinity)).toBe('0.00');
    });
  });

  describe('Centralized Volume Formatting (formatMarketVolume)', () => {
    test('formats billions ($B) correctly', () => {
      expect(formatMarketVolume(1_500_000_000)).toBe('$1.50B');
      expect(formatMarketVolume(12_340_000_000)).toBe('$12.34B');
    });

    test('formats millions ($M) correctly', () => {
      expect(formatMarketVolume(45_200_000)).toBe('$45.20M');
      expect(formatMarketVolume(1_000_000)).toBe('$1.00M');
    });

    test('formats thousands ($K) correctly', () => {
      expect(formatMarketVolume(120_500)).toBe('$120.5K');
      expect(formatMarketVolume(1_000)).toBe('$1.0K');
    });

    test('formats sub-thousand volume as whole dollars', () => {
      expect(formatMarketVolume(540)).toBe('$540');
      expect(formatMarketVolume(0)).toBe('$0.00');
      expect(formatMarketVolume(-50)).toBe('$0.00');
    });
  });

  describe('Orderbook Size & Spread Formatting', () => {
    test('formats orderbook quantities with institutional precision', () => {
      expect(formatBookSize(2_500_000)).toBe('2.50M');
      expect(formatBookSize(15_400)).toBe('15.4K');
      expect(formatBookSize(12.345)).toBe('12.35');
      expect(formatBookSize(0.125)).toBe('0.125');
      expect(formatBookSize(0)).toBe('0.000');
    });

    test('formats spreads across different tick regimes', () => {
      expect(formatSpread(1.5)).toBe('1.50');
      expect(formatSpread(0.05)).toBe('0.0500');
      expect(formatSpread(0.00025)).toBe('0.000250');
      expect(formatSpread(0.0000015)).toBe('0.00000150');
    });
  });

  describe('Asset Pair & rToken Recognition', () => {
    test('parses USDT and USDC quote assets accurately', () => {
      expect(parseAssetPair('BTCUSDT')).toEqual({ baseAsset: 'BTC', quoteAsset: 'USDT' });
      expect(parseAssetPair('ETHUSDC')).toEqual({ baseAsset: 'ETH', quoteAsset: 'USDC' });
      expect(parseAssetPair('RTSLAUSDT')).toEqual({ baseAsset: 'RTSLA', quoteAsset: 'USDT' });
      expect(parseAssetPair('')).toEqual({ baseAsset: '', quoteAsset: 'USDT' });
    });

    test('identifies tokenized synthetic equity assets', () => {
      expect(isRTokenSymbol('TSLAUSDT')).toBe(true);
      expect(isRTokenSymbol('RTSLAUSDT')).toBe(true);
      expect(isRTokenSymbol('NVDAUSDT')).toBe(true);
      expect(isRTokenSymbol('RNVDAUSDT')).toBe(true);
      expect(isRTokenSymbol('AAPLUSDT')).toBe(true);
      expect(isRTokenSymbol('SPYUSDT')).toBe(true);

      // Crypto pairs must NOT be identified as rTokens
      expect(isRTokenSymbol('BTCUSDT')).toBe(false);
      expect(isRTokenSymbol('ETHUSDT')).toBe(false);
      expect(isRTokenSymbol('SOLUSDT')).toBe(false);
      expect(isRTokenSymbol('DOGEUSDT')).toBe(false);
    });
  });
});
