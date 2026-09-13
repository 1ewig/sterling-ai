import { BITGET_REST_BASE } from '../rest';
import { normalizeSymbol } from '../symbols';
import { toV3Category, type BitgetV3Category, type BitgetInstrument } from '../types';

export type { BitgetInstrument };

// In-memory module cache for high-frequency sub-millisecond precision lookups
const instrumentsMemoryCache = new Map<string, BitgetInstrument>();

// Standard baseline fallback configurations for major assets if network is offline
const DEFAULT_INSTRUMENTS: Record<string, Partial<BitgetInstrument>> = {
  BTCUSDT: {
    symbol: 'BTCUSDT',
    category: 'USDT-FUTURES',
    baseCoin: 'BTC',
    quoteCoin: 'USDT',
    minTradeNum: '0.001',
    pricePlace: '1',
    volumePlace: '3',
    minTradeUSDT: '5',
    maxMarketOrderQty: '50',
    maxLeverage: '125',
    status: 'online',
  },
  ETHUSDT: {
    symbol: 'ETHUSDT',
    category: 'USDT-FUTURES',
    baseCoin: 'ETH',
    quoteCoin: 'USDT',
    minTradeNum: '0.01',
    pricePlace: '2',
    volumePlace: '2',
    minTradeUSDT: '5',
    maxMarketOrderQty: '500',
    maxLeverage: '100',
    status: 'online',
  },
  SOLUSDT: {
    symbol: 'SOLUSDT',
    category: 'USDT-FUTURES',
    baseCoin: 'SOL',
    quoteCoin: 'USDT',
    minTradeNum: '0.1',
    pricePlace: '2',
    volumePlace: '1',
    minTradeUSDT: '5',
    maxMarketOrderQty: '2000',
    maxLeverage: '50',
    status: 'online',
  },
  RTSLAUSDT: {
    symbol: 'RTSLAUSDT',
    category: 'SPOT',
    baseCoin: 'RTSLA',
    quoteCoin: 'USDT',
    minTradeNum: '0.01',
    pricePlace: '2',
    volumePlace: '2',
    minTradeUSDT: '5',
    maxMarketOrderQty: '1000',
    maxLeverage: '1',
    status: 'online',
  },
};

/**
 * Fetch and cache instruments catalog from Bitget v3 public API
 */
export async function fetchInstrumentsV3(
  category: BitgetV3Category = 'USDT-FUTURES'
): Promise<BitgetInstrument[]> {
  try {
    const url = `${BITGET_REST_BASE}/api/v3/market/instruments?category=${category}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];

    const json = (await res.json()) as {
      code: string;
      data?: Array<{
        symbol: string;
        baseCoin?: string;
        quoteCoin?: string;
        minTradeNum?: string;
        pricePlace?: string;
        volumePlace?: string;
        priceMultiplier?: string;
        quantityMultiplier?: string;
        minTradeUSDT?: string;
        maxMarketOrderQty?: string;
        maxLeverage?: string;
        status?: string;
        buyLimitPriceRatio?: string;
        sellLimitPriceRatio?: string;
      }>;
    };

    if ((json.code === '00000' || json.code === '0') && json.data) {
      const list: BitgetInstrument[] = json.data.map((item) => ({
        symbol: normalizeSymbol(item.symbol),
        category,
        baseCoin: item.baseCoin || '',
        quoteCoin: item.quoteCoin || 'USDT',
        minTradeNum: item.minTradeNum || '0.001',
        pricePlace: item.pricePlace || '2',
        volumePlace: item.volumePlace || '2',
        priceMultiplier: item.priceMultiplier,
        quantityMultiplier: item.quantityMultiplier,
        minTradeUSDT: item.minTradeUSDT || '5',
        maxMarketOrderQty: item.maxMarketOrderQty || '100000',
        maxLeverage: item.maxLeverage || '50',
        status: (item.status || 'online').toLowerCase(),
        buyLimitPriceRatio: item.buyLimitPriceRatio,
        sellLimitPriceRatio: item.sellLimitPriceRatio,
      }));

      for (const inst of list) {
        instrumentsMemoryCache.set(`${inst.category}:${inst.symbol}`, inst);
      }

      return list;
    }
  } catch (err) {
    console.warn('[Instruments] Network fetch failed, using fallback:', err);
  }

  return [];
}

/**
 * Resolves instrument precision metadata for a given symbol and category
 */
export async function getInstrument(
  symbol: string,
  categoryInput?: string
): Promise<BitgetInstrument> {
  const normSym = normalizeSymbol(symbol);
  const category = toV3Category(categoryInput);
  const cacheKey = `${category}:${normSym}`;

  const cached = instrumentsMemoryCache.get(cacheKey);
  if (cached) return cached;

  const fetched = await fetchInstrumentsV3(category);
  const found = fetched.find((i) => i.symbol === normSym);
  if (found) return found;

  // Fallback to default or heuristic baseline
  const fallback = DEFAULT_INSTRUMENTS[normSym] || {
    symbol: normSym,
    category,
    baseCoin: normSym.replace(/USDT|USDC/g, ''),
    quoteCoin: 'USDT',
    minTradeNum: '0.001',
    pricePlace: '2',
    volumePlace: '2',
    minTradeUSDT: '5',
    maxMarketOrderQty: '10000',
    maxLeverage: '50',
    status: 'online',
  };

  const inst: BitgetInstrument = {
    symbol: normSym,
    category,
    baseCoin: fallback.baseCoin || '',
    quoteCoin: fallback.quoteCoin || 'USDT',
    minTradeNum: fallback.minTradeNum || '0.001',
    pricePlace: fallback.pricePlace || '2',
    volumePlace: fallback.volumePlace || '2',
    priceMultiplier: fallback.priceMultiplier,
    quantityMultiplier: fallback.quantityMultiplier,
    minTradeUSDT: fallback.minTradeUSDT || '5',
    maxMarketOrderQty: fallback.maxMarketOrderQty || '10000',
    maxLeverage: fallback.maxLeverage || '50',
    status: fallback.status || 'online',
    buyLimitPriceRatio: fallback.buyLimitPriceRatio,
    sellLimitPriceRatio: fallback.sellLimitPriceRatio,
  };

  instrumentsMemoryCache.set(cacheKey, inst);
  return inst;
}

/**
 * Snaps a price value to the instrument's allowed tick size / precision places
 */
export function snapPriceToTick(price: number, instrument: BitgetInstrument): number {
  const decimals = Math.max(0, parseInt(instrument.pricePlace || '2', 10));
  const factor = Math.pow(10, decimals);
  return Math.round(price * factor) / factor;
}

/**
 * Snaps an order quantity to the instrument's step size / precision places.
 * Critical Bitget Rule: On Spot Market Buy, the order size is in QUOTE currency (USDT),
 * whereas limit orders and sell orders are in base currency.
 */
export function snapQtyToStep(
  qty: number,
  instrument: BitgetInstrument,
  isSpotMarketBuy = false
): number {
  const decimals = isSpotMarketBuy
    ? 2 // USDT quote currency on spot is standard 2 decimal places
    : Math.max(0, parseInt(instrument.volumePlace || '2', 10));

  const factor = Math.pow(10, decimals);
  const snapped = Math.floor(qty * factor) / factor;
  return Math.max(0, snapped);
}

/**
 * Validates order parameters against instrument exchange constraints
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateOrderConstraints(
  params: {
    symbol: string;
    orderType: 'limit' | 'market';
    side?: 'buy' | 'sell';
    size: number;
    price?: number;
    livePrice?: number;
    leverage?: number;
    isSpotMarketBuy?: boolean;
  },
  instrument: BitgetInstrument
): ValidationResult {
  if (instrument.status !== 'online') {
    return {
      valid: false,
      error: `Trading for instrument ${instrument.symbol} is currently ${instrument.status.toUpperCase()} on Bitget.`,
    };
  }

  const minQty = parseFloat(instrument.minTradeNum || '0.001');
  if (!params.isSpotMarketBuy && params.size < minQty) {
    return {
      valid: false,
      error: `Order size (${params.size}) is below the minimum allowed quantity (${minQty}) for ${instrument.symbol}.`,
    };
  }

  const maxMarket = parseFloat(instrument.maxMarketOrderQty || '100000');
  if (params.orderType === 'market' && params.size > maxMarket) {
    return {
      valid: false,
      error: `Market order size (${params.size}) exceeds exchange maximum market size (${maxMarket}) for ${instrument.symbol}.`,
    };
  }

  const maxLev = parseInt(instrument.maxLeverage || '50', 10);
  if (params.leverage && params.leverage > maxLev) {
    return {
      valid: false,
      error: `Leverage multiple (${params.leverage}x) exceeds maximum allowed leverage (${maxLev}x) for ${instrument.symbol}.`,
    };
  }

  const minNotional = parseFloat(instrument.minTradeUSDT || '5');
  const notional = params.price ? params.size * params.price : params.size;
  if (notional < minNotional) {
    return {
      valid: false,
      error: `Order notional value ($${notional.toFixed(2)}) is below the minimum required notional ($${minNotional.toFixed(2)}).`,
    };
  }

  // Limit price band validation (Bitget buyLimitPriceRatio / sellLimitPriceRatio)
  if (params.orderType === 'limit' && params.price && params.livePrice && params.livePrice > 0) {
    const limitRatio = parseFloat(
      (params.side === 'sell' ? instrument.sellLimitPriceRatio : instrument.buyLimitPriceRatio) || '0.07'
    );
    if (limitRatio > 0) {
      const maxAllowed = params.livePrice * (1 + limitRatio);
      const minAllowed = params.livePrice * (1 - limitRatio);
      if (params.price > maxAllowed || params.price < minAllowed) {
        const pct = (limitRatio * 100).toFixed(0);
        return {
          valid: false,
          error: `Limit price ($${params.price}) exceeds Bitget ±${pct}% price limit band relative to current market ($${params.livePrice.toFixed(2)}). Allowed range: $${minAllowed.toFixed(2)} - $${maxAllowed.toFixed(2)}.`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Calculates realistic tiered Maintenance Margin Rate (MMR) based on position notional value
 * replaces hardcoded 0.005
 */
export function getTierMmr(symbol: string, notionalUsdt: number): number {
  const cleanSym = normalizeSymbol(symbol);

  // BTC / ETH Tier brackets
  if (cleanSym.startsWith('BTC') || cleanSym.startsWith('ETH')) {
    if (notionalUsdt <= 50000) return 0.004; // 0.4% base tier MMR
    if (notionalUsdt <= 250000) return 0.005; // 0.5%
    if (notionalUsdt <= 1000000) return 0.01; // 1.0%
    return 0.02; // 2.0%
  }

  // Mid-cap altcoins & equities
  if (notionalUsdt <= 20000) return 0.006; // 0.6% base
  if (notionalUsdt <= 100000) return 0.01; // 1.0%
  if (notionalUsdt <= 500000) return 0.02; // 2.0%
  return 0.05; // 5.0%
}
