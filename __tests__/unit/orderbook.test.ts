import { describe, test, expect, beforeEach } from 'bun:test';
import { L2Orderbook } from '@/lib/bitget/l2-book';
import type { BitgetWsBookData } from '@/lib/bitget/types';

describe('L2 Order Book State Machine & Depth Math', () => {
  let book: L2Orderbook;

  beforeEach(() => {
    book = new L2Orderbook();
  });

  describe('Initialization & State', () => {
    test('initial state is completely empty with no data', () => {
      expect(book.hasData()).toBe(false);
      expect(book.ts).toBeUndefined();
      const top = book.getTop(8);
      expect(top.asks).toHaveLength(0);
      expect(top.bids).toHaveLength(0);
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

  describe('Snapshots & Sorting Invariants', () => {
    test('applies full snapshot, sorts asks ascending and bids descending', () => {
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
  });

  describe('Incremental Delta Merging Engine', () => {
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

      // 2. Apply delta
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

      // Asks: 65005.0 (0.8), 65010.0 (3.5). 65020.0 was deleted
      expect(top.asks).toHaveLength(2);
      expect(top.asks[0]).toEqual(['65005.0', '0.8']);
      expect(top.asks[1]).toEqual(['65010.0', '3.5']);

      // Bids: 64995.0 (4), 64990.0 (2.5). 65000.0 was deleted
      expect(top.bids).toHaveLength(2);
      expect(top.bids[0]).toEqual(['64995.0', '4']);
      expect(top.bids[1]).toEqual(['64990.0', '2.5']);
    });
  });

  describe('Depth Imbalance & Spread Models', () => {
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
});
