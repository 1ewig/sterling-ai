import { describe, test, expect } from 'bun:test';
import type { BitgetWsTickerData } from '@/lib/bitget/types';

describe('Derivatives Flow Metrics & Settlement Suite', () => {
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

  test('computes countdown format correctly for future settlements', () => {
    const futureTime = Date.now() + 3600 * 1000 * 4 + 15 * 60 * 1000 + 30 * 1000; // 4h 15m 30s
    const diff = futureTime - Date.now();
    const totalSecs = Math.floor(diff / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatted = `${pad(h)}:${pad(m)}:${pad(s)}`;

    expect(formatted).toMatch(/^04:15:3[0-1]$/);
  });
});
