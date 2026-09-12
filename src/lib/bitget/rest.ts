import type {
  BitgetTicker,
  FundingRateInfo,
  KlineCandle,
  OpenInterestInfo,
  OrderbookDepth,
} from './types';
import { normalizeSymbol } from './symbols';

export const BITGET_REST_BASE = 'https://api.bitget.com';

function normalizeV3Interval(granularity: string): string {
  const g = granularity.toUpperCase().trim();
  switch (g) {
    case '1MIN':
    case '1M':
      return '1m';
    case '5MIN':
    case '5M':
      return '5m';
    case '15MIN':
    case '15M':
      return '15m';
    case '30MIN':
    case '30M':
      return '30m';
    case '1H':
    case '60MIN':
      return '1H';
    case '4H':
      return '4H';
    case '1D':
    case 'D':
      return '1D';
    case '1W':
    case 'W':
      return '1W';
    default:
      return '4H';
  }
}

/**
 * Fetch Spot or Futures Ticker using Bitget V3 public market endpoints with cross-market fallback.
 */
export async function fetchBitgetTicker(symbol: string, isFutures = true): Promise<BitgetTicker> {
  const sym = normalizeSymbol(symbol);

  // 1. Try V3 Futures ticker first if requested
  if (isFutures) {
    try {
      const endpoint = `${BITGET_REST_BASE}/api/v3/market/tickers?category=USDT-FUTURES&symbol=${sym}`;
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 10 },
      });
      if (res.ok) {
        const json = (await res.json()) as { code: string; data?: Array<Record<string, string>> };
        const item = json.data?.find((t) => t.symbol === sym) || json.data?.[0];
        if (item && item.lastPrice) {
          return {
            symbol: item.symbol || sym,
            lastPr: item.lastPrice,
            high24h: item.highPrice24h || '0',
            low24h: item.lowPrice24h || '0',
            change24h: item.price24hPcnt || '0',
            usdtVolume: item.turnover24h || item.volume24h,
            quoteVolume: item.turnover24h,
            baseVolume: item.volume24h,
            ts: item.ts,
          };
        }
      }
    } catch {
      // Fall through to spot fallback
    }
  }

  // 2. V3 Spot market query / fallback
  try {
    const spotEndpoint = `${BITGET_REST_BASE}/api/v3/market/tickers?category=SPOT&symbol=${sym}`;
    const spotRes = await fetch(spotEndpoint, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 10 },
    });
    if (spotRes.ok) {
      const json = (await spotRes.json()) as { code: string; data?: Array<Record<string, string>> };
      const item = json.data?.find((t) => t.symbol === sym) || json.data?.[0];
      if (item && item.lastPrice) {
        return {
          symbol: item.symbol || sym,
          lastPr: item.lastPrice,
          high24h: item.highPrice24h || '0',
          low24h: item.lowPrice24h || '0',
          change24h: item.price24hPcnt || '0',
          usdtVolume: item.turnover24h || item.volume24h,
          quoteVolume: item.turnover24h,
          baseVolume: item.volume24h,
          ts: item.ts,
        };
      }
    }
  } catch {
    // Handled below
  }

  throw new Error(
    `Symbol "${sym}" was not found on Bitget V3 Futures or Spot markets. Available examples: BTCUSDT, ETHUSDT, SOLUSDT, TSLAUSDT, NVDAUSDT, SPYUSDT, XAUUSDT.`
  );
}

/**
 * Fetch Candlesticks (OHLCV) via Bitget V3 with timeframe normalization and cross-market fallback.
 */
export async function fetchBitgetCandles(
  symbol: string,
  granularity = '4H',
  limit = 100,
  isFutures = true
): Promise<KlineCandle[]> {
  const sym = normalizeSymbol(symbol);
  const interval = normalizeV3Interval(granularity);
  const safeLimit = Math.min(Math.max(limit, 30), 200);

  // 1. Try V3 Futures Candlesticks
  if (isFutures) {
    try {
      const endpoint = `${BITGET_REST_BASE}/api/v3/market/candles?category=USDT-FUTURES&symbol=${sym}&interval=${interval}&limit=${safeLimit}`;
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 30 },
      });
      if (res.ok) {
        const json = (await res.json()) as { code: string; data?: string[][] };
        if (json.data && json.data.length >= 10) {
          return json.data
            .map((row) => ({
              timestamp: parseInt(row[0], 10),
              open: parseFloat(row[1]),
              high: parseFloat(row[2]),
              low: parseFloat(row[3]),
              close: parseFloat(row[4]),
              volume: parseFloat(row[5] || '0'),
              quoteVolume: parseFloat(row[6] || '0'),
            }))
            .sort((a, b) => a.timestamp - b.timestamp);
        }
      }
    } catch {
      // Fall through to spot fallback
    }
  }

  // 2. Try V3 Spot Candlesticks Fallback
  try {
    const spotEndpoint = `${BITGET_REST_BASE}/api/v3/market/candles?category=SPOT&symbol=${sym}&interval=${interval}&limit=${safeLimit}`;
    const spotRes = await fetch(spotEndpoint, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 30 },
    });
    if (spotRes.ok) {
      const json = (await spotRes.json()) as { code: string; data?: string[][] };
      if (json.data && json.data.length >= 10) {
        return json.data
          .map((row) => ({
            timestamp: parseInt(row[0], 10),
            open: parseFloat(row[1]),
            high: parseFloat(row[2]),
            low: parseFloat(row[3]),
            close: parseFloat(row[4]),
            volume: parseFloat(row[5] || '0'),
            quoteVolume: parseFloat(row[6] || '0'),
          }))
          .sort((a, b) => a.timestamp - b.timestamp);
      }
    }
  } catch {
    // Handled below
  }

  throw new Error(
    `Insufficient or unretrievable candlestick data for "${sym}" (${granularity}). Supported timeframes: 15min, 1h, 4h, 1d, 1w.`
  );
}

/**
 * Fetch Futures Funding Rate via Bitget V3
 */
export async function fetchFundingRate(symbol: string): Promise<FundingRateInfo | null> {
  const sym = normalizeSymbol(symbol);
  try {
    const res = await fetch(
      `${BITGET_REST_BASE}/api/v3/market/current-fund-rate?symbol=${sym}&category=USDT-FUTURES`,
      {
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: FundingRateInfo[] };
    return json.data?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * Fetch Futures Open Interest via Bitget V3
 */
export async function fetchOpenInterest(symbol: string): Promise<OpenInterestInfo | null> {
  const sym = normalizeSymbol(symbol);
  try {
    const res = await fetch(
      `${BITGET_REST_BASE}/api/v3/market/open-interest?symbol=${sym}&category=USDT-FUTURES`,
      {
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { list?: Array<{ symbol: string; openInterest: string }>; ts?: string };
    };
    const item = json.data?.list?.find((i) => i.symbol === sym) || json.data?.list?.[0];
    if (!item) return null;
    return { symbol: item.symbol, size: item.openInterest, timestamp: json.data?.ts };
  } catch {
    return null;
  }
}

/**
 * Fetch Orderbook Depth Snapshot via Bitget V3
 */
export async function fetchOrderbook(
  symbol: string,
  limit = 5,
  isFutures = true
): Promise<OrderbookDepth | null> {
  const sym = normalizeSymbol(symbol);
  try {
    const category = isFutures ? 'USDT-FUTURES' : 'SPOT';
    const endpoint = `${BITGET_REST_BASE}/api/v3/market/orderbook?category=${category}&symbol=${sym}&limit=${limit}`;

    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 5 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: {
        a?: [number, number][];
        b?: [number, number][];
        asks?: [string, string][];
        bids?: [string, string][];
        ts?: string;
      };
    };
    if (!json.data) return null;

    const asks: [string, string][] = (json.data.a || json.data.asks || []).map(([p, s]) => [
      p.toString(),
      s.toString(),
    ]);
    const bids: [string, string][] = (json.data.b || json.data.bids || []).map(([p, s]) => [
      p.toString(),
      s.toString(),
    ]);

    return {
      symbol: sym,
      asks,
      bids,
      timestamp: json.data.ts,
    };
  } catch {
    return null;
  }
}

