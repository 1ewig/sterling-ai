import type {
  BitgetTicker,
  FundingRateInfo,
  KlineCandle,
  OpenInterestInfo,
  OrderbookDepth,
} from './types';
import { normalizeSymbol, normalizeGranularity } from './symbols';

export const BITGET_REST_BASE = 'https://api.bitget.com';

/**
 * Fetch Spot or Futures Ticker for a symbol with automatic cross-market fallback.
 */
export async function fetchBitgetTicker(symbol: string, isFutures = true): Promise<BitgetTicker> {
  const sym = normalizeSymbol(symbol);

  // 1. Try Futures ticker first if requested
  if (isFutures) {
    try {
      const endpoint = `${BITGET_REST_BASE}/api/v2/mix/market/ticker?productType=USDT-FUTURES&symbol=${sym}`;
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 10 },
      });
      if (res.ok) {
        const json = (await res.json()) as { code: string; msg: string; data?: BitgetTicker[] };
        const item = json.data?.find((t) => t.symbol === sym) || json.data?.[0];
        if (item && item.symbol === sym && item.lastPr) {
          return item;
        }
      }
    } catch {
      // Fall through to spot fallback
    }
  }

  // 2. Spot market query / fallback
  try {
    const spotEndpoint = `${BITGET_REST_BASE}/api/v2/spot/market/tickers?symbol=${sym}`;
    const spotRes = await fetch(spotEndpoint, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 10 },
    });
    if (spotRes.ok) {
      const json = (await spotRes.json()) as { code: string; msg: string; data?: BitgetTicker[] };
      const item = json.data?.find((t) => t.symbol === sym);
      if (item && item.lastPr) {
        return item;
      }
    }
  } catch {
    // Handled below
  }

  throw new Error(
    `Symbol "${sym}" was not found on Bitget Futures or Spot markets. Available examples: BTCUSDT, ETHUSDT, SOLUSDT, TSLAUSDT, NVDAUSDT, SPYUSDT, XAUUSDT.`
  );
}

/**
 * Fetch Candlesticks (OHLCV) with timeframe normalization and cross-market fallback.
 */
export async function fetchBitgetCandles(
  symbol: string,
  granularity = '4H',
  limit = 100,
  isFutures = true
): Promise<KlineCandle[]> {
  const sym = normalizeSymbol(symbol);
  const gran = normalizeGranularity(granularity);
  const safeLimit = Math.min(Math.max(limit, 30), 200);

  // 1. Try Futures Candlesticks
  if (isFutures) {
    try {
      const endpoint = `${BITGET_REST_BASE}/api/v2/mix/market/candles?productType=USDT-FUTURES&symbol=${sym}&granularity=${gran}&limit=${safeLimit}`;
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 30 },
      });
      if (res.ok) {
        const json = (await res.json()) as { code: string; msg: string; data?: string[][] };
        if (json.data && json.data.length >= 30) {
          return json.data
            .map((row) => ({
              timestamp: parseInt(row[0], 10),
              open: parseFloat(row[1]),
              high: parseFloat(row[2]),
              low: parseFloat(row[3]),
              close: parseFloat(row[4]),
              volume: parseFloat(row[5]),
              quoteVolume: parseFloat(row[6] || '0'),
            }))
            .sort((a, b) => a.timestamp - b.timestamp);
        }
      }
    } catch {
      // Fall through to spot fallback
    }
  }

  // 2. Try Spot Candlesticks Fallback
  try {
    const spotEndpoint = `${BITGET_REST_BASE}/api/v2/spot/market/candles?symbol=${sym}&granularity=${gran}&limit=${safeLimit}`;
    const spotRes = await fetch(spotEndpoint, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 30 },
    });
    if (spotRes.ok) {
      const json = (await spotRes.json()) as { code: string; msg: string; data?: string[][] };
      if (json.data && json.data.length >= 30) {
        return json.data
          .map((row) => ({
            timestamp: parseInt(row[0], 10),
            open: parseFloat(row[1]),
            high: parseFloat(row[2]),
            low: parseFloat(row[3]),
            close: parseFloat(row[4]),
            volume: parseFloat(row[5]),
            quoteVolume: parseFloat(row[6] || '0'),
          }))
          .sort((a, b) => a.timestamp - b.timestamp);
      }
    }
  } catch {
    // Handled below
  }

  throw new Error(
    `Insufficient or unretrievable candlestick data for "${sym}" (${gran}). Supported timeframes: 15min, 1h, 4h, 1d, 1w.`
  );
}

/**
 * Fetch Futures Funding Rate
 */
export async function fetchFundingRate(symbol: string): Promise<FundingRateInfo | null> {
  const sym = normalizeSymbol(symbol);
  try {
    const res = await fetch(
      `${BITGET_REST_BASE}/api/v2/mix/market/current-fund-rate?symbol=${sym}&productType=USDT-FUTURES`,
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
 * Fetch Futures Open Interest
 */
export async function fetchOpenInterest(symbol: string): Promise<OpenInterestInfo | null> {
  const sym = normalizeSymbol(symbol);
  try {
    const res = await fetch(
      `${BITGET_REST_BASE}/api/v2/mix/market/open-interest?symbol=${sym}&productType=USDT-FUTURES`,
      {
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { openInterestList?: Array<{ symbol: string; size: string }>; ts?: string };
    };
    const item =
      json.data?.openInterestList?.find((i) => i.symbol === sym) ||
      json.data?.openInterestList?.[0];
    if (!item) return null;
    return { symbol: item.symbol, size: item.size, timestamp: json.data?.ts };
  } catch {
    return null;
  }
}

/**
 * Fetch Orderbook Depth Snapshot
 */
export async function fetchOrderbook(
  symbol: string,
  limit = 5,
  isFutures = true
): Promise<OrderbookDepth | null> {
  const sym = normalizeSymbol(symbol);
  try {
    const endpoint = isFutures
      ? `${BITGET_REST_BASE}/api/v2/mix/market/orderbook?symbol=${sym}&productType=USDT-FUTURES&type=step0&limit=${limit}`
      : `${BITGET_REST_BASE}/api/v2/spot/market/orderbook?symbol=${sym}&type=step0&limit=${limit}`;

    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 5 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { asks?: [string, string][]; bids?: [string, string][]; ts?: string };
    };
    if (!json.data) return null;
    return {
      symbol: sym,
      asks: json.data.asks || [],
      bids: json.data.bids || [],
      timestamp: json.data.ts,
    };
  } catch {
    return null;
  }
}
