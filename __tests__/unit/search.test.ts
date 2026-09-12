import { describe, test, expect } from 'bun:test';

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

describe('Symbol Catalog Tiered Fuzzy Search Suite', () => {
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
