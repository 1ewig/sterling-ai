import { NextResponse } from 'next/server';
import { parseAssetPair, isRTokenSymbol, BITGET_REST_BASE } from '@/lib/bitget';

export const revalidate = 3600; // Cache for 1 hour via ISR

interface BitgetV3TickerItem {
  symbol?: string;
  lastPrice?: string;
  lastPr?: string;
  highPrice24h?: string;
  lowPrice24h?: string;
  price24hPcnt?: string;
  change24h?: string;
  turnover24h?: string;
  volume24h?: string;
  usdtVolume?: string;
  quoteVolume?: string;
  baseVolume?: string;
  ts?: string;
}

export interface MarketSymbolItem {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  change24h?: string;
  volume24h: number;
  isRToken?: boolean;
  hasSpot: boolean;
  hasFutures: boolean;
}

const BITGET_SPOT_TICKERS_URL = `${BITGET_REST_BASE}/api/v3/market/tickers?category=SPOT`;
const BITGET_FUTURES_TICKERS_URL = `${BITGET_REST_BASE}/api/v3/market/tickers?category=USDT-FUTURES`;

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
    const futuresTickerMap = new Map<string, BitgetV3TickerItem>();
    if (futuresRes.ok) {
      try {
        const futuresJson = (await futuresRes.json()) as { code: string; data?: BitgetV3TickerItem[] };
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
        const spotJson = (await spotRes.json()) as { code: string; data?: BitgetV3TickerItem[] };
        const rawSpotTickers = spotJson.data || [];

        for (const item of rawSpotTickers) {
          const sym = (item.symbol || '').toUpperCase().trim();
          if (!sym.endsWith('USDT') && !sym.endsWith('USDC')) {
            continue;
          }

          const { baseAsset, quoteAsset } = parseAssetPair(sym);
          if (!baseAsset) continue;

          const price = parseFloat(item.lastPrice || item.lastPr || '0') || 0;
          const volume24h = parseFloat(item.turnover24h || item.usdtVolume || item.quoteVolume || '0') || 0;

          // Check direct futures match or rToken equity perpetual match (e.g. RTSLAUSDT -> TSLAUSDT)
          const unwrappedFuturesSym =
            baseAsset.startsWith('R') && baseAsset.length > 1
              ? `${baseAsset.slice(1)}${quoteAsset}`
              : null;
          const hasFutures =
            futuresTickerMap.has(sym) ||
            (unwrappedFuturesSym !== null && futuresTickerMap.has(unwrappedFuturesSym));

          const isRToken = isRTokenSymbol(sym);

          itemsMap.set(sym, {
            symbol: sym,
            baseAsset,
            quoteAsset,
            price,
            change24h: `${(parseFloat(item.price24hPcnt || item.change24h || '0') * 100).toFixed(2)}%`,
            volume24h,
            isRToken,
            hasSpot: true,
            hasFutures,
          });
        }
      } catch {
        // Ignore spot parse error
      }
    }

    // 3. Add Futures-only pairs not present in spot
    futuresTickerMap.forEach((item, sym) => {
      if (!itemsMap.has(sym) && (sym.endsWith('USDT') || sym.endsWith('USDC'))) {
        const { baseAsset, quoteAsset } = parseAssetPair(sym);
        if (!baseAsset) return;

        const price = parseFloat(item.lastPrice || item.lastPr || '0') || 0;
        const volume24h = parseFloat(item.turnover24h || item.usdtVolume || item.quoteVolume || '0') || 0;
        const isRToken = isRTokenSymbol(sym);

        itemsMap.set(sym, {
          symbol: sym,
          baseAsset,
          quoteAsset,
          price,
          change24h: `${(parseFloat(item.price24hPcnt || item.change24h || '0') * 100).toFixed(2)}%`,
          volume24h,
          isRToken,
          hasSpot: false,
          hasFutures: true,
        });
      }
    });

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
