import { NextResponse } from 'next/server';

export const revalidate = 3600; // Cache for 1 hour via ISR

interface BitgetSpotTickerRaw {
  symbol: string;
  lastPr: string;
  usdtVolume?: string;
  baseVolume?: string;
  quoteVolume?: string;
}

interface BitgetFuturesTickerRaw {
  symbol: string;
  lastPr: string;
  usdtVolume?: string;
  baseVolume?: string;
  quoteVolume?: string;
  high24h?: string;
  low24h?: string;
}

export interface MarketSymbolItem {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  volume24h: number;
  hasSpot: boolean;
  hasFutures: boolean;
}

const BITGET_SPOT_TICKERS_URL = 'https://api.bitget.com/api/v2/spot/market/tickers';
const BITGET_FUTURES_TICKERS_URL = 'https://api.bitget.com/api/v2/mix/market/tickers?productType=USDT-FUTURES';

export async function GET() {
  try {
    const [spotRes, futuresRes] = await Promise.all([
      fetch(BITGET_SPOT_TICKERS_URL, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000),
      }),
      fetch(BITGET_FUTURES_TICKERS_URL, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    if (!spotRes.ok && !futuresRes.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch market symbols from upstream exchange' },
        { status: 502 }
      );
    }

    const itemsMap = new Map<string, MarketSymbolItem>();

    // 1. Process Futures Tickers
    const futuresTickerMap = new Map<string, BitgetFuturesTickerRaw>();
    if (futuresRes.ok) {
      try {
        const futuresJson = (await futuresRes.json()) as { code: string; data?: BitgetFuturesTickerRaw[] };
        (futuresJson.data || []).forEach((f) => {
          if (f.symbol) {
            futuresTickerMap.set(f.symbol.toUpperCase(), f);
          }
        });
      } catch {
        // Ignore futures parse error if spot succeeds
      }
    }

    // 2. Process Spot Tickers (Marks dual-market and spot-only pairs)
    if (spotRes.ok) {
      try {
        const spotJson = (await spotRes.json()) as { code: string; data?: BitgetSpotTickerRaw[] };
        const rawSpotTickers = spotJson.data || [];

        for (const item of rawSpotTickers) {
          const sym = (item.symbol || '').toUpperCase().trim();
          if (!sym.endsWith('USDT') && !sym.endsWith('USDC')) {
            continue;
          }

          const quoteAsset = sym.endsWith('USDC') ? 'USDC' : 'USDT';
          const baseAsset = sym.replace(/(USDT|USDC)$/, '');
          if (!baseAsset) continue;

          const price = parseFloat(item.lastPr || '0') || 0;
          const volume24h = parseFloat(item.usdtVolume || item.quoteVolume || '0') || 0;

          // Check direct futures match or rToken equity perpetual match (e.g. RTSLAUSDT -> TSLAUSDT)
          const unwrappedFuturesSym =
            baseAsset.startsWith('R') && baseAsset.length > 1
              ? `${baseAsset.slice(1)}${quoteAsset}`
              : null;
          const hasFutures =
            futuresTickerMap.has(sym) ||
            (unwrappedFuturesSym !== null && futuresTickerMap.has(unwrappedFuturesSym));

          itemsMap.set(sym, {
            symbol: sym,
            baseAsset,
            quoteAsset,
            price,
            volume24h,
            hasSpot: true,
            hasFutures,
          });
        }
      } catch {
        // Ignore spot error if futures succeeds
      }
    }

    // 3. Process Futures Tickers (Identifies futures-only and tokenized equity futures)
    for (const [sym, f] of futuresTickerMap.entries()) {
      if (!sym.endsWith('USDT') && !sym.endsWith('USDC')) {
        continue;
      }
      if (itemsMap.has(sym)) {
        continue; // Already processed via direct spot match
      }

      const quoteAsset = sym.endsWith('USDC') ? 'USDC' : 'USDT';
      const baseAsset = sym.replace(/(USDT|USDC)$/, '');
      if (!baseAsset) continue;

      // Check if spot has the corresponding tokenized equity rToken (e.g. RTSLAUSDT for TSLAUSDT)
      const rTokenSpotSym = `R${baseAsset}${quoteAsset}`;
      const hasSpot = itemsMap.has(rTokenSpotSym);

      const price = parseFloat(f.lastPr || '0') || 0;
      const volume24h = parseFloat(f.usdtVolume || f.quoteVolume || '0') || 0;

      itemsMap.set(sym, {
        symbol: sym,
        baseAsset,
        quoteAsset,
        price,
        volume24h,
        hasSpot,
        hasFutures: true,
      });
    }

    // Sort descending by 24h USD volume so top liquid pairs appear first
    const items = Array.from(itemsMap.values()).sort((a, b) => b.volume24h - a.volume24h);

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
