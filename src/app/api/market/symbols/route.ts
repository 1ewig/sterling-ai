import { NextResponse } from 'next/server';

export const revalidate = 3600; // Cache for 1 hour via ISR

interface BitgetSpotTickerRaw {
  symbol: string;
  lastPr: string;
  usdtVolume?: string;
  baseVolume?: string;
  quoteVolume?: string;
}

interface BitgetFuturesContractRaw {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
}

export interface MarketSymbolItem {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  volume24h: number;
  hasFutures: boolean;
}

const BITGET_SPOT_TICKERS_URL = 'https://api.bitget.com/api/v2/spot/market/tickers';
const BITGET_FUTURES_CONTRACTS_URL = 'https://api.bitget.com/api/v2/mix/market/contracts?productType=USDT-FUTURES';

export async function GET() {
  try {
    const [spotRes, futuresRes] = await Promise.all([
      fetch(BITGET_SPOT_TICKERS_URL, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000),
      }),
      fetch(BITGET_FUTURES_CONTRACTS_URL, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    if (!spotRes.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch spot symbols from upstream market' },
        { status: 502 }
      );
    }

    const spotJson = (await spotRes.json()) as { code: string; data?: BitgetSpotTickerRaw[] };
    const rawSpotTickers = spotJson.data || [];

    // Parse futures set for O(1) perpetual availability lookup
    const futuresSet = new Set<string>();
    if (futuresRes.ok) {
      try {
        const futuresJson = (await futuresRes.json()) as { code: string; data?: BitgetFuturesContractRaw[] };
        (futuresJson.data || []).forEach((c) => {
          if (c.symbol) futuresSet.add(c.symbol.toUpperCase());
        });
      } catch {
        // Continue with spot even if futures contracts parse fails
      }
    }

    // Process and normalize spot tickers into MarketSymbolItems
    const items: MarketSymbolItem[] = [];

    for (const item of rawSpotTickers) {
      const sym = (item.symbol || '').toUpperCase().trim();
      // Focus on primary liquid USDT pairs
      if (!sym.endsWith('USDT') && !sym.endsWith('USDC')) {
        continue;
      }

      const quoteAsset = sym.endsWith('USDC') ? 'USDC' : 'USDT';
      const baseAsset = sym.replace(/(USDT|USDC)$/, '');
      if (!baseAsset) continue;

      const price = parseFloat(item.lastPr || '0') || 0;
      const volume24h = parseFloat(item.usdtVolume || item.quoteVolume || '0') || 0;

      items.push({
        symbol: sym,
        baseAsset,
        quoteAsset,
        price,
        volume24h,
        hasFutures: futuresSet.has(sym),
      });
    }

    // Sort descending by 24h USD volume so top liquid pairs appear first
    items.sort((a, b) => b.volume24h - a.volume24h);

    return NextResponse.json(
      {
        symbols: items,
        total: items.length,
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (err) {
    console.error('[API /api/market/symbols] Error fetching symbols:', err);
    return NextResponse.json(
      { error: 'Internal error while fetching market symbols' },
      { status: 500 }
    );
  }
}
