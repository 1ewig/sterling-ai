import type { BitgetWsBookData } from './types';

/**
 * Pure in-memory L2 Order Book state machine.
 * Maintains sorted bid/ask levels, processes delta updates (adds, updates, deletions when size=0),
 * and provides instant top-N slices without React lifecycle dependencies.
 */
export class L2Orderbook {
  private asks = new Map<string, number>();
  private bids = new Map<string, number>();
  public ts?: string;

  public clear(): void {
    this.asks.clear();
    this.bids.clear();
    this.ts = undefined;
  }

  public hasData(): boolean {
    return this.asks.size > 0 || this.bids.size > 0;
  }

  /**
   * Applies an order book snapshot, resetting existing state.
   */
  public applySnapshot(
    bookData: BitgetWsBookData,
    isPreSorted = false
  ): { asks: [string, string][]; bids: [string, string][] } {
    this.clear();
    this.ts = bookData.ts;

    (bookData.asks || []).forEach(([p, s]) => {
      const sz = parseFloat(s);
      if (sz > 0) this.asks.set(p, sz);
    });

    (bookData.bids || []).forEach(([p, s]) => {
      const sz = parseFloat(s);
      if (sz > 0) this.bids.set(p, sz);
    });

    if (isPreSorted) {
      return {
        asks: (bookData.asks || []).slice(0, 8),
        bids: (bookData.bids || []).slice(0, 8),
      };
    }

    this.pruneLevels();
    return this.getTop(8);
  }

  /**
   * Applies an incremental delta update. Drops if snapshot hasn't seeded yet.
   */
  public applyUpdate(
    bookData: BitgetWsBookData
  ): { asks: [string, string][]; bids: [string, string][] } | null {
    if (!this.hasData()) return null;
    this.ts = bookData.ts;

    (bookData.asks || []).forEach(([p, s]) => {
      const sz = parseFloat(s);
      if (sz <= 0) this.asks.delete(p);
      else this.asks.set(p, sz);
    });

    (bookData.bids || []).forEach(([p, s]) => {
      const sz = parseFloat(s);
      if (sz <= 0) this.bids.delete(p);
      else this.bids.set(p, sz);
    });

    this.pruneLevels();
    return this.getTop(8);
  }

  /**
   * Discards price levels far from the spread to prevent unbounded Map growth
   * and ensure instant O(K log K) sorting during high-frequency ticks.
   */
  private pruneLevels(): void {
    const MAX_LEVELS = 80;
    const KEEP_LEVELS = 40;

    if (this.asks.size > MAX_LEVELS) {
      const sortedAsks = Array.from(this.asks.keys()).sort((a, b) => parseFloat(a) - parseFloat(b));
      for (let i = KEEP_LEVELS; i < sortedAsks.length; i++) {
        this.asks.delete(sortedAsks[i]);
      }
    }

    if (this.bids.size > MAX_LEVELS) {
      const sortedBids = Array.from(this.bids.keys()).sort((a, b) => parseFloat(b) - parseFloat(a));
      for (let i = KEEP_LEVELS; i < sortedBids.length; i++) {
        this.bids.delete(sortedBids[i]);
      }
    }
  }

  /**
   * Extracts top N asks (ascending) and bids (descending).
   */
  public getTop(count = 8): { asks: [string, string][]; bids: [string, string][] } {
    const topAsks = Array.from(this.asks.entries())
      .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
      .slice(0, count)
      .map(([p, s]) => [p, String(s)] as [string, string]);

    const topBids = Array.from(this.bids.entries())
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .slice(0, count)
      .map(([p, s]) => [p, String(s)] as [string, string]);

    return { asks: topAsks, bids: topBids };
  }
}
