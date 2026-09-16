import { normalizeSymbol } from '../symbols';
import { sortQueryString, type BitgetCredentials } from '../auth/signer';
import { classifyBitgetError } from '../auth/errors';
import { safeGetJson } from './fetch';
import {
  toV3Category,
  type BitgetAccountSource,
  type BitgetErrorDetails,
  type BitgetV3Category,
  type BitgetV3OrderInfo,
} from '../types';

/** Categories aggregated when the caller requests 'all' (all verified live for unfilled-orders) */
export const ALL_ORDER_CATEGORIES: BitgetV3Category[] = ['USDT-FUTURES', 'SPOT', 'COIN-FUTURES', 'USDC-FUTURES'];

/** Raw order shape returned by GET /api/v3/trade/unfilled-orders (UTA v3) */
export interface RawUnfilledOrder {
  orderId?: string;
  clientOid?: string;
  category?: string;
  symbol?: string;
  side?: 'buy' | 'sell';
  orderType?: string;
  price?: string;
  qty?: string;
  amount?: string;
  size?: string;
  baseVolume?: string;
  cumExecQty?: string;
  cumExecValue?: string;
  avgPrice?: string;
  timeInForce?: string;
  orderStatus?: string;
  status?: string;
  tradeSide?: string;
  cancelReason?: string;
  execType?: string;
  posSide?: string;
  holdMode?: string;
  reduceOnly?: string;
  marginMode?: string;
  delegateType?: string;
  stpMode?: string;
  takeProfit?: string | null;
  stopLoss?: string | null;
  tpTriggerBy?: string | null;
  slTriggerBy?: string | null;
  tpOrderType?: string | null;
  slOrderType?: string | null;
  cTime?: string;
  uTime?: string;
  createdTime?: string;
  updatedTime?: string;
  feeDetail?: Array<{ feeCoin: string; fee: string }>;
}

/** Map a raw unfilled-orders item to the enriched BitgetV3OrderInfo (v3 uses `qty`, not `size`) */
export function mapOpenOrder(o: RawUnfilledOrder, category: BitgetV3Category): BitgetV3OrderInfo {
  const rawStatus = o.orderStatus || o.status || 'new';
  const feeDetail = Array.isArray(o.feeDetail)
    ? o.feeDetail
        .filter((f) => f && (f.feeCoin ?? '') !== '' && (f.fee ?? '') !== '')
        .map((f) => ({ feeCoin: f.feeCoin ?? '', fee: f.fee ?? '' }))
    : undefined;

  const posSide = o.posSide === 'long' || o.posSide === 'short' ? o.posSide : o.posSide === '' ? '' : undefined;
  const holdMode = o.holdMode === 'one_way_mode' || o.holdMode === 'hedge_mode' ? o.holdMode : undefined;

  let resolvedSize = o.size && o.size !== '0' ? o.size : undefined;
  if (!resolvedSize) {
    if (o.qty && o.qty !== '0') {
      resolvedSize = o.qty;
    } else if (o.baseVolume && parseFloat(o.baseVolume) > 0) {
      resolvedSize = o.baseVolume;
    } else if (o.amount && parseFloat(o.amount) > 0) {
      resolvedSize = `${o.amount} USDT`;
    } else {
      resolvedSize = o.qty || '0';
    }
  }

  return {
    orderId: o.orderId || '',
    clientOid: o.clientOid,
    symbol: o.symbol || '',
    category,
    side: o.side || 'buy',
    orderType: (o.orderType === 'market' ? 'market' : 'limit') as 'limit' | 'market',
    price: o.price,
    size: resolvedSize,
    status: rawStatus as BitgetV3OrderInfo['status'],
    baseVolume: o.baseVolume,
    amount: o.amount,
    cumExecQty: o.cumExecQty,
    cumExecValue: o.cumExecValue,
    avgPrice: o.avgPrice,
    feeDetail,
    cTime: o.createdTime || o.cTime,
    uTime: o.updatedTime || o.uTime,
    posSide,
    holdMode,
    reduceOnly: o.reduceOnly === 'YES' || o.reduceOnly === 'NO' ? o.reduceOnly : undefined,
    timeInForce: (o.timeInForce as BitgetV3OrderInfo['timeInForce']) || undefined,
    marginMode: o.marginMode === 'crossed' || o.marginMode === 'isolated' ? o.marginMode : undefined,
    delegateType: o.delegateType,
    tradeSide: o.tradeSide === 'open' || o.tradeSide === 'close' ? o.tradeSide : undefined,
    stpMode: o.stpMode,
    takeProfit: o.takeProfit ?? undefined,
    stopLoss: o.stopLoss ?? undefined,
    tpTriggerBy: o.tpTriggerBy ?? undefined,
    slTriggerBy: o.slTriggerBy ?? undefined,
    tpOrderType: o.tpOrderType ?? undefined,
    slOrderType: o.slOrderType ?? undefined,
    cancelReason: o.cancelReason,
    execType: o.execType,
    rawStatus,
  };
}

/**
 * Fetch detailed state of a single order via GET /api/v3/trade/order-info
 */
export async function getOrderInfoV3(
  symbol: string,
  categoryInput?: string,
  orderId?: string,
  clientOid?: string,
  credentials?: BitgetCredentials
): Promise<BitgetV3OrderInfo | null> {
  const path = '/api/v3/trade/order-info';
  const category = toV3Category(categoryInput);
  const normSym = normalizeSymbol(symbol);

  const queryParts = [`category=${category}`, `symbol=${normSym}`];
  if (orderId) queryParts.push(`orderId=${orderId}`);
  if (clientOid) queryParts.push(`clientOid=${clientOid}`);
  const queryString = sortQueryString(queryParts.join('&'));

  try {
    const result = await safeGetJson('GET', path, queryString, undefined, false, credentials);
    if (!result.ok || !result.json?.data) {
      return null;
    }

    const data = result.json.data;
    const orderRaw = (
      Array.isArray(data)
        ? data[0]
        : (data as { list?: RawUnfilledOrder[] }).list
        ? (data as { list: RawUnfilledOrder[] }).list[0]
        : data
    ) as RawUnfilledOrder | undefined;

    if (orderRaw && orderRaw.orderId) {
      return mapOpenOrder(orderRaw, category);
    }
    return null;
  } catch (err) {
    console.warn('[Orders] getOrderInfoV3 query failed:', err);
    return null;
  }
}

/**
 * Fetch one page-series of unfilled orders for a single category using cursor pagination.
 * v3 docs: cursor is the smallest orderId of the current page and returns OLDER orders;
 * `limit` max 100, default 100. Never throws — returns the error that forced an early stop.
 */
export async function fetchOpenOrderCategory(
  category: BitgetV3Category,
  symbol?: string,
  maxPages = 10,
  credentials?: BitgetCredentials
): Promise<{ orders: BitgetV3OrderInfo[]; pages: number; error?: BitgetErrorDetails }> {
  const baseParts = [`category=${category}`];
  if (symbol) baseParts.push(`symbol=${normalizeSymbol(symbol)}`);
  baseParts.push('limit=100');

  const orders: BitgetV3OrderInfo[] = [];
  let pages = 0;
  let error: BitgetErrorDetails | undefined;
  let cursor: string | undefined;
  let done = false;

  while (!done && pages < maxPages) {
    const parts = cursor ? [...baseParts, `cursor=${cursor}`] : baseParts;
    const queryString = sortQueryString(parts.join('&'));
    const result = await safeGetJson('GET', '/api/v3/trade/unfilled-orders', queryString, undefined, false, credentials);

    if (!result.ok || !result.json) {
      error = result.error ?? classifyBitgetError('0', 'Unknown unfilled-orders failure');
      break;
    }

    const data = result.json.data as
      | { list?: RawUnfilledOrder[]; cursor?: string | null }
      | RawUnfilledOrder[]
      | null
      | undefined;
    const rawList: RawUnfilledOrder[] = Array.isArray(data) ? data : data?.list || [];

    if (rawList.length === 0) break;

    const mapped = rawList.map((o) => mapOpenOrder(o, category));
    orders.push(...mapped);
    pages++;

    const nextCursor = !Array.isArray(data) ? data?.cursor : undefined;
    if (!nextCursor || nextCursor === cursor || rawList.length < 100) {
      done = true;
    } else {
      cursor = nextCursor;
    }
  }

  return { orders, pages, error };
}

export interface FetchOpenOrdersOptions {
  symbol?: string;
  categoryInput?: string;
  maxPages?: number;
}

export interface OpenOrdersResult {
  /** True when at least one category returned usable data (including a healthy empty list) */
  success: boolean;
  orders: BitgetV3OrderInfo[];
  perCategory: Record<string, BitgetV3OrderInfo[]>;
  categories: BitgetV3Category[];
  sources: Record<string, BitgetAccountSource>;
  warnings: string[];
  totalPages: number;
  /** Error details when ALL categories failed */
  error?: BitgetErrorDetails;
}

/**
 * Fetch unfilled (open/working) orders across one or all categories with cursor pagination,
 * per-source diagnostics, and graceful degradation. Never throws.
 */
export async function fetchOpenOrdersV3(
  opts: FetchOpenOrdersOptions = {},
  credentials?: BitgetCredentials
): Promise<OpenOrdersResult> {
  const { symbol, categoryInput = 'USDT-FUTURES', maxPages = 10 } = opts;
  const rawCategory = categoryInput === 'all' ? 'all' : toV3Category(categoryInput);
  const categories: BitgetV3Category[] =
    rawCategory === 'all' ? ALL_ORDER_CATEGORIES : [rawCategory];

  const settled = await Promise.allSettled(
    categories.map((cat) => fetchOpenOrderCategory(cat, symbol, maxPages, credentials))
  );

  const perCategory: Record<string, BitgetV3OrderInfo[]> = {};
  const sources: Record<string, BitgetAccountSource> = {};
  const warnings: string[] = [];
  const orders: BitgetV3OrderInfo[] = [];
  let totalPages = 0;
  let firstError: BitgetErrorDetails | undefined;

  settled.forEach((s, i) => {
    const cat = categories[i];
    const outcome = s.status === 'fulfilled' ? s.value : undefined;
    const catOrders = outcome?.orders ?? [];
    const catPages = outcome?.pages ?? 0;
    const catError = outcome?.error;

    perCategory[cat] = catOrders;
    orders.push(...catOrders);
    totalPages += catPages;

    if (catError) {
      if (!firstError) firstError = catError;
      const guidance = catError.actionableGuidance ? ` ${catError.actionableGuidance}` : '';
      warnings.push(`Open-orders query failed for ${cat}: ${catError.message}.${guidance}`);
      sources[cat] = { ok: catOrders.length > 0, error: catError };
    } else {
      sources[cat] = { ok: true };
    }
  });

  const success = Object.values(sources).some((src) => src.ok);

  return {
    success,
    orders,
    perCategory,
    categories,
    sources,
    warnings,
    totalPages,
    error: !success ? firstError : undefined,
  };
}

