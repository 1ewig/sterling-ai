import { BITGET_REST_BASE } from '../rest';
import { normalizeSymbol } from '../symbols';
import { getAuthHeaders, sortQueryString } from '../auth/signer';
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
  posSide?: string;
  holdMode?: string;
  reduceOnly?: string;
  marginMode?: string;
  delegateType?: string;
  tradeSide?: string;
  stpMode?: string;
  takeProfit?: string;
  stopLoss?: string;
  tpTriggerBy?: string;
  slTriggerBy?: string;
  tpOrderType?: string;
  slOrderType?: string;
  feeDetail?: Array<{ feeCoin?: string | null; fee?: string | null }>;
  cancelReason?: string;
  execType?: string;
  createdTime?: string;
  updatedTime?: string;
  cTime?: string;
  uTime?: string;
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

  return {
    orderId: o.orderId || '',
    clientOid: o.clientOid,
    symbol: o.symbol || '',
    category,
    side: o.side || 'buy',
    orderType: (o.orderType === 'market' ? 'market' : 'limit') as 'limit' | 'market',
    price: o.price,
    size: o.size || o.qty || '0',
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
    takeProfit: o.takeProfit,
    stopLoss: o.stopLoss,
    tpTriggerBy: o.tpTriggerBy,
    slTriggerBy: o.slTriggerBy,
    tpOrderType: o.tpOrderType,
    slOrderType: o.slOrderType,
    cancelReason: o.cancelReason,
    execType: o.execType,
    rawStatus,
  };
}

/**
 * Query detailed execution status of a specific order
 */
export async function getOrderInfoV3(
  symbol: string,
  categoryInput?: string,
  orderId?: string,
  clientOid?: string
): Promise<BitgetV3OrderInfo | null> {
  const path = '/api/v3/trade/order-info';
  const category = toV3Category(categoryInput);
  const normSym = normalizeSymbol(symbol);

  const queryParts = [`category=${category}`, `symbol=${normSym}`];
  if (orderId) queryParts.push(`orderId=${orderId}`);
  if (clientOid) queryParts.push(`clientOid=${clientOid}`);
  // Bitget requires query params sorted alphabetically by key for GET signature verification
  const queryString = sortQueryString(queryParts.join('&'));

  try {
    const headers = getAuthHeaders('GET', path, queryString);
    const response = await fetch(`${BITGET_REST_BASE}${path}?${queryString}`, {
      method: 'GET',
      headers,
    });

    const json = (await response.json()) as {
      code: string;
      data?:
        | {
            orderId: string;
            clientOid?: string;
            symbol: string;
            side: 'buy' | 'sell';
            orderType: 'limit' | 'market';
            price?: string;
            size?: string;
            qty?: string;
            baseVolume?: string;
            status: 'init' | 'new' | 'partially_filled' | 'filled' | 'cancelled';
            cumExecQty?: string;
            avgPrice?: string;
            feeDetail?: Array<{ feeCoin: string; fee: string }>;
            cTime?: string;
            uTime?: string;
            list?: Array<{
              orderId: string;
              clientOid?: string;
              symbol: string;
              side: 'buy' | 'sell';
              orderType: 'limit' | 'market';
              price?: string;
              size?: string;
              qty?: string;
              status: 'init' | 'new' | 'partially_filled' | 'filled' | 'cancelled';
              baseVolume?: string;
              cumExecQty?: string;
              avgPrice?: string;
              feeDetail?: Array<{ feeCoin: string; fee: string }>;
              cTime?: string;
              uTime?: string;
            }>;
          }
        | Array<{
            orderId: string;
            clientOid?: string;
            symbol: string;
            side: 'buy' | 'sell';
            orderType: 'limit' | 'market';
            price?: string;
            size?: string;
            qty?: string;
            status: 'init' | 'new' | 'partially_filled' | 'filled' | 'cancelled';
            baseVolume?: string;
            cumExecQty?: string;
            avgPrice?: string;
            feeDetail?: Array<{ feeCoin: string; fee: string }>;
            cTime?: string;
            uTime?: string;
          }>;
    };

    if ((json.code === '00000' || json.code === '0') && json.data) {
      const order = Array.isArray(json.data)
        ? json.data[0]
        : Array.isArray(json.data.list)
        ? json.data.list[0]
        : json.data;

      if (order && order.orderId) {
        const raw = order as unknown as {
          orderStatus?: string;
          createdTime?: string;
          updatedTime?: string;
        };
        return {
          orderId: order.orderId,
          clientOid: order.clientOid,
          symbol: order.symbol || normSym,
          category,
          side: order.side,
          orderType: order.orderType,
          price: order.price,
          size: order.size || order.qty || '0',
          status: (raw.orderStatus || order.status || 'new') as BitgetV3OrderInfo['status'],
          baseVolume: order.baseVolume,
          cumExecQty: order.cumExecQty,
          avgPrice: order.avgPrice,
          feeDetail: order.feeDetail,
          cTime: raw.createdTime || order.cTime,
          uTime: raw.updatedTime || order.uTime,
        };
      }
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
  maxPages = 10
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
    const result = await safeGetJson('GET', '/api/v3/trade/unfilled-orders', queryString);

    if (!result.ok || !result.json) {
      error = result.error ?? classifyBitgetError('0', 'Unknown unfilled-orders failure');
      break;
    }

    const data = result.json.data as
      | { list?: RawUnfilledOrder[]; cursor?: string | null }
      | RawUnfilledOrder[]
      | null
      | undefined;
    const rawList: RawUnfilledOrder[] = Array.isArray(data) ? data : data?.list ?? [];

    orders.push(...rawList.map((o) => mapOpenOrder(o, category)));
    pages += 1;

    const nextCursor = data && !Array.isArray(data) ? data.cursor : undefined;
    if (!nextCursor || rawList.length === 0) {
      done = true;
    } else {
      cursor = nextCursor;
    }
  }

  return { orders, pages, error };
}

export interface FetchOpenOrdersOptions {
  symbol?: string;
  /** Category to query; 'all' aggregates USDT-FUTURES + SPOT + COIN-FUTURES + USDC-FUTURES */
  categoryInput?: string;
  /** Max pagination pages per category (each page ≤ 100 orders); default 10 */
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
export async function fetchOpenOrdersV3(opts: FetchOpenOrdersOptions = {}): Promise<OpenOrdersResult> {
  const { symbol, categoryInput = 'USDT-FUTURES', maxPages = 10 } = opts;
  const rawCategory = categoryInput === 'all' ? 'all' : toV3Category(categoryInput);
  const categories: BitgetV3Category[] =
    rawCategory === 'all' ? ALL_ORDER_CATEGORIES : [rawCategory];

  const settled = await Promise.allSettled(categories.map((cat) => fetchOpenOrderCategory(cat, symbol, maxPages)));

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

