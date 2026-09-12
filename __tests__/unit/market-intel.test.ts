import { describe, test, expect } from 'bun:test';
import { getMarketIntel } from '@/lib/bitget/analysts';
import { newsBriefingParamsSchema } from '@/agent/types';

describe('Market Intelligence & News Perception Suite', () => {
  test('getMarketIntel parses multi-chain TVL, stablecoins, and gas deterministically', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url.includes('/v2/chains')) {
          return {
            ok: true,
            json: async () => [
              { name: 'Ethereum', tvl: 58_000_000_000, tokenSymbol: 'ETH' },
              { name: 'Solana', tvl: 9_200_000_000, tokenSymbol: 'SOL' },
              { name: 'Tron', tvl: 8_100_000_000, tokenSymbol: 'TRX' },
              { name: 'Arbitrum', tvl: 4_500_000_000, tokenSymbol: 'ARB' },
              { name: 'Base', tvl: 3_200_000_000, tokenSymbol: 'ETH' },
            ],
          } as Response;
        }
        if (url.includes('stablecoins')) {
          return {
            ok: true,
            json: async () => ({
              peggedAssets: [
                { circulating: { peggedUSD: 120_000_000_000 } },
                { circulating: { peggedUSD: 50_000_000_000 } },
              ],
            }),
          } as Response;
        }
        return { ok: false } as Response;
      }) as unknown as typeof fetch;

      const intel = await getMarketIntel('all');

      // Provenance
      expect(intel.source).toBe('defillama + datahub_mcp');

      // Total TVL check
      expect(intel.defi.totalTvl).toBe('$83.0B');

      // Top chains check
      expect(Array.isArray(intel.defi.topChains)).toBe(true);
      expect(intel.defi.topChains).toHaveLength(5);

      const firstChain = intel.defi.topChains?.[0];
      expect(firstChain?.name).toBe('Ethereum');
      expect(firstChain?.tvl).toBe('$58.0B');
      expect(firstChain?.share).toBe('69.9%');

      // Stablecoin supply
      expect(intel.defi.stablecoinSupply).toBe('$170.0B');

      // Network health
      expect(typeof intel.networkHealth?.ethGasGwei).toBe('number');
      expect((intel.networkHealth?.ethGasGwei ?? 0)).toBeGreaterThan(0);

      // Summary statement
      expect(typeof intel.summary).toBe('string');
      expect(intel.summary.includes('Ethereum (69.9%)')).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('getMarketIntel gracefully degrades to desk baselines on network failure', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () => {
        throw new Error('Network offline');
      }) as unknown as typeof fetch;

      const intel = await getMarketIntel('all');

      expect(intel.source).toBe('defillama + datahub_mcp');
      expect(intel.defi.totalTvl).toBe('$98.4B');
      expect(intel.defi.stablecoinSupply).toBe('$168.5B');
      expect(intel.defi.topChains?.length).toBeGreaterThanOrEqual(3);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('newsBriefingParamsSchema parses and defaults parameters correctly', () => {
    const parsed = newsBriefingParamsSchema.parse({});
    expect(parsed.topic).toBe('crypto market');
    expect(parsed.limit).toBe(4);
    expect(parsed.symbol).toBeUndefined();

    const withSymbol = newsBriefingParamsSchema.parse({
      symbol: 'BTC',
      topic: 'ETF inflows',
      limit: 6,
    });
    expect(withSymbol.symbol).toBe('BTC');
    expect(withSymbol.topic).toBe('ETF inflows');
    expect(withSymbol.limit).toBe(6);
  });

  test('newsBriefingParamsSchema clamps limits within bounds', () => {
    expect(() => newsBriefingParamsSchema.parse({ limit: 1 })).toThrow();
    expect(() => newsBriefingParamsSchema.parse({ limit: 10 })).toThrow();
  });
});
