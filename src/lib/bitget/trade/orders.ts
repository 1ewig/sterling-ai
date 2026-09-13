import { BITGET_REST_BASE } from '../rest';
import { normalizeSymbol } from '../symbols';
import { getAuthHeaders, sortQueryString } from '../auth/signer';
import { classifyBitgetError } from '../auth/errors';
import {
  buildPlaceOrderPayload,
  buildModifyPayload,
  buildCancelPayload,
  buildBatchCancelPayload,
  buildClosePositionsPayload,
} from './payloads';
import {
  toV3Category,
  type BitgetV3OrderParams,
  type BitgetV3OrderResponse,
  type BitgetV3ModifyParams,
  type BitgetV3CancelParams,
  type BitgetV3OrderInfo,
} from '../types';

/**
 * Submit an order using Bitget UTA (v3) with Classic (v2) fallback
 */
export async function placeOrderV3(
  params: BitgetV3OrderParams
): Promise<BitgetV3OrderResponse> {
  const path = '/api/v3/trade/place-order';
  const payload = buildPlaceOrderPayload(params);

  try {
    const headers = getAuthHeaders('POST', path, '', payload as unknown as Record<string, unknown>);
    const response = await fetch(`${BITGET_REST_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const json = (await response.json()) as {
      code: string;
      msg: string;
      data?: { orderId: string; clientOid?: string };
    };

    if (json.code === '00000' || json.code === '0') {
      return {
        orderId: json.data?.orderId || '',
        clientOid: json.data?.clientOid || payload.clientOid,
        symbol: payload.symbol,
        category: payload.category,
        status: 'submitted',
      };
    }

    const err = classifyBitgetError(json.code, json.msg);
    throw new Error(`Bitget Place Order failed [${json.code}]: ${err.message}. ${err.actionableGuidance}`);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Bitget Place Order failed: Unknown error');
  }
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
 * Fetch all unfilled (open/working) orders
 */
export async function getUnfilledOrdersV3(
  symbol?: string,
  categoryInput = 'USDT-FUTURES'
): Promise<BitgetV3OrderInfo[]> {
  if (categoryInput === 'all') {
    const categories = ['USDT-FUTURES', 'SPOT', 'COIN-FUTURES', 'USDC-FUTURES'];
    const results = await Promise.allSettled(
      categories.map((cat) => getUnfilledOrdersV3(symbol, cat))
    );
    const combined: BitgetV3OrderInfo[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        combined.push(...r.value);
      }
    }
    return combined;
  }

  const path = '/api/v3/trade/unfilled-orders';
  const category = toV3Category(categoryInput);

  const queryParts = [`category=${category}`];
  if (symbol) queryParts.push(`symbol=${normalizeSymbol(symbol)}`);
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
            cTime?: string;
            uTime?: string;
          }>;
    };

    if (json.code === '00000' || json.code === '0') {
      const rawList = Array.isArray(json.data)
        ? json.data
        : (json.data && 'list' in json.data && Array.isArray(json.data.list))
        ? json.data.list
        : [];

      return rawList.map((o) => {
        const rawStatus = (o as unknown as { orderStatus?: string; createdTime?: string; updatedTime?: string });
        return {
          orderId: o.orderId,
          clientOid: o.clientOid,
          symbol: o.symbol,
          category,
          side: o.side,
          orderType: o.orderType,
          price: o.price,
          size: o.size || o.qty || '0',
          status: (rawStatus.orderStatus || o.status || 'new') as BitgetV3OrderInfo['status'],
          baseVolume: o.baseVolume,
          cumExecQty: o.cumExecQty,
          avgPrice: o.avgPrice,
          cTime: rawStatus.createdTime || o.cTime,
          uTime: rawStatus.updatedTime || o.uTime,
        };
      });
    }

    return [];
  } catch (err) {
    console.warn('[Orders] getUnfilledOrdersV3 query failed:', err);
    return [];
  }
}

/**
 * Modify an active in-flight order on Bitget
 */
export async function modifyOrderV3(
  params: BitgetV3ModifyParams
): Promise<{ success: boolean; orderId?: string }> {
  const path = '/api/v3/trade/modify-order';
  const payload = buildModifyPayload(params);

  const headers = getAuthHeaders('POST', path, '', payload as unknown as Record<string, unknown>);
  const response = await fetch(`${BITGET_REST_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as { code: string; msg: string; data?: { orderId?: string } };

  if (json.code !== '00000' && json.code !== '0') {
    const err = classifyBitgetError(json.code, json.msg);
    throw new Error(`Bitget Modify Order failed [${json.code}]: ${err.message}. ${err.actionableGuidance}`);
  }

  return {
    success: true,
    orderId: json.data?.orderId || params.orderId,
  };
}

/**
 * Cancel an open order on Bitget
 */
export async function cancelOrderV3(
  params: BitgetV3CancelParams
): Promise<{ success: boolean; orderId?: string; alreadyTerminal?: boolean; message?: string }> {
  const path = '/api/v3/trade/cancel-order';
  const payload = buildCancelPayload(params);

  const headers = getAuthHeaders('POST', path, '', payload as unknown as Record<string, unknown>);
  const response = await fetch(`${BITGET_REST_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as { code: string; msg: string; data?: { orderId?: string } };

  if (json.code === '00000' || json.code === '0') {
    return {
      success: true,
      orderId: json.data?.orderId || params.orderId,
    };
  }

  // 25204: Order does not exist (already filled or cancelled)
  if (json.code === '25204') {
    return {
      success: true,
      orderId: params.orderId,
      alreadyTerminal: true,
      message: 'Order does not exist on exchange (already filled or cancelled).',
    };
  }

  const err = classifyBitgetError(json.code, json.msg);
  throw new Error(`Bitget Cancel Order failed [${json.code}]: ${err.message}. ${err.actionableGuidance}`);
}

/**
 * Batch cancel all open orders for a specific trading pair
 */
export async function cancelSymbolOrdersV3(
  symbol: string,
  categoryInput?: string
): Promise<{ success: boolean; count?: number }> {
  const path = '/api/v3/trade/cancel-symbol-order';
  const payload = buildBatchCancelPayload(symbol, categoryInput);

  const headers = getAuthHeaders('POST', path, '', payload as unknown as Record<string, unknown>);
  const response = await fetch(`${BITGET_REST_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as { code: string; msg: string; data?: unknown };

  if (json.code === '00000' || json.code === '0') {
    return {
      success: true,
    };
  }

  const err = classifyBitgetError(json.code, json.msg);
  throw new Error(`Bitget Cancel Symbol Orders failed [${json.code}]: ${err.message}. ${err.actionableGuidance}`);
}

/**
 * Market close a position via reduce-only order
 */
export async function closePositionsV3(
  symbol: string,
  categoryInput: string,
  side: 'buy' | 'sell',
  size?: string,
  posSide: 'long' | 'short' | 'net' = 'net'
): Promise<BitgetV3OrderResponse> {
  const payload = buildClosePositionsPayload(symbol, categoryInput, side, size, posSide);
  return placeOrderV3(payload as unknown as BitgetV3OrderParams);
}
