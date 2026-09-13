import { BITGET_REST_BASE } from '../rest';
import { normalizeSymbol } from '../symbols';
import { getAuthHeaders } from '../auth/signer';
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

    // Classic Account Fallback (Code 40084 or 40404)
    if (json.code === '40084' || json.code === '40404') {
      const isFutures = payload.category !== 'SPOT';
      const v2Path = isFutures ? '/api/v2/mix/order/place-order' : '/api/v2/spot/trade/place-order';
      const v2Payload: Record<string, unknown> = isFutures
        ? {
            symbol: payload.symbol,
            productType: payload.category,
            marginCoin: 'USDT',
            marginMode: params.marginMode || 'crossed',
            side: params.side,
            tradeSide: params.tradeSide || 'open',
            orderType: params.orderType,
            size: params.size,
            price: params.price,
            clientOid: payload.clientOid,
            presetStopLossPrice: params.stopLoss?.triggerPrice || params.presetStopLossPrice,
            presetTakeProfitPrice: params.takeProfit?.triggerPrice || params.presetTakeProfitPrice,
          }
        : {
            symbol: payload.symbol,
            side: params.side,
            orderType: params.orderType,
            size: params.size,
            price: params.price,
            clientOid: payload.clientOid,
          };

      const v2Headers = getAuthHeaders('POST', v2Path, '', v2Payload);
      const v2Res = await fetch(`${BITGET_REST_BASE}${v2Path}`, {
        method: 'POST',
        headers: v2Headers,
        body: JSON.stringify(v2Payload),
      });
      const v2Json = (await v2Res.json()) as {
        code: string;
        msg: string;
        data?: { orderId?: string; clientOid?: string };
      };

      if (v2Json.code === '00000' || v2Json.code === '0') {
        return {
          orderId: v2Json.data?.orderId || '',
          clientOid: v2Json.data?.clientOid || payload.clientOid,
          symbol: payload.symbol,
          category: payload.category,
          status: 'submitted',
        };
      }

      const v2Err = classifyBitgetError(v2Json.code, v2Json.msg);
      throw new Error(`Bitget Place Order failed [${v2Json.code}]: ${v2Err.message}. ${v2Err.actionableGuidance}`);
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
  const queryString = queryParts.join('&');

  try {
    const headers = getAuthHeaders('GET', path, queryString);
    const response = await fetch(`${BITGET_REST_BASE}${path}?${queryString}`, {
      method: 'GET',
      headers,
    });

    const json = (await response.json()) as {
      code: string;
      data?: {
        orderId: string;
        clientOid?: string;
        symbol: string;
        side: 'buy' | 'sell';
        orderType: 'limit' | 'market';
        price?: string;
        size: string;
        status: 'init' | 'new' | 'partially_filled' | 'filled' | 'cancelled';
        baseVolume?: string;
        cumExecQty?: string;
        avgPrice?: string;
        feeDetail?: Array<{ feeCoin: string; fee: string }>;
        cTime?: string;
        uTime?: string;
      };
    };

    if ((json.code === '00000' || json.code === '0') && json.data) {
      return {
        ...json.data,
        category,
      };
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
  categoryInput?: string
): Promise<BitgetV3OrderInfo[]> {
  const path = '/api/v3/trade/unfilled-orders';
  const category = toV3Category(categoryInput);

  const queryParts = [`category=${category}`];
  if (symbol) queryParts.push(`symbol=${normalizeSymbol(symbol)}`);
  const queryString = queryParts.join('&');

  try {
    const headers = getAuthHeaders('GET', path, queryString);
    const response = await fetch(`${BITGET_REST_BASE}${path}?${queryString}`, {
      method: 'GET',
      headers,
    });

    const json = (await response.json()) as {
      code: string;
      data?: Array<{
        orderId: string;
        clientOid?: string;
        symbol: string;
        side: 'buy' | 'sell';
        orderType: 'limit' | 'market';
        price?: string;
        size: string;
        status: 'init' | 'new' | 'partially_filled' | 'filled' | 'cancelled';
        baseVolume?: string;
        cumExecQty?: string;
        avgPrice?: string;
        cTime?: string;
        uTime?: string;
      }>;
    };

    if ((json.code === '00000' || json.code === '0') && Array.isArray(json.data)) {
      return json.data.map((o) => ({
        ...o,
        category,
      }));
    }

    // Classic Account Fallback (Code 40084 or 40404)
    if (json.code === '40084' || json.code === '40404') {
      const isFutures = category !== 'SPOT';
      const v2Path = isFutures ? '/api/v2/mix/order/orders-pending' : '/api/v2/spot/trade/unfilled-orders';
      const v2QueryParts = isFutures ? [`productType=${category}`] : [];
      if (symbol) v2QueryParts.push(`symbol=${normalizeSymbol(symbol)}`);
      const v2Query = v2QueryParts.join('&');

      const v2Headers = getAuthHeaders('GET', v2Path, v2Query);
      const v2Res = await fetch(`${BITGET_REST_BASE}${v2Path}${v2Query ? `?${v2Query}` : ''}`, {
        method: 'GET',
        headers: v2Headers,
      });
      const v2Json = (await v2Res.json()) as {
        code: string;
        data?: Array<{
          orderId: string;
          clientOid?: string;
          symbol: string;
          side: 'buy' | 'sell';
          orderType: 'limit' | 'market';
          price?: string;
          size: string;
          status?: string;
          baseVolume?: string;
          cumExecQty?: string;
          cTime?: string;
          uTime?: string;
        }>;
      };

      if ((v2Json.code === '00000' || v2Json.code === '0') && Array.isArray(v2Json.data)) {
        return v2Json.data.map((o) => ({
          orderId: o.orderId,
          clientOid: o.clientOid,
          symbol: o.symbol,
          side: o.side,
          orderType: o.orderType,
          price: o.price,
          size: o.size,
          status: (o.status as BitgetV3OrderInfo['status']) || 'new',
          baseVolume: o.baseVolume,
          cumExecQty: o.cumExecQty,
          cTime: o.cTime,
          uTime: o.uTime,
          category,
        }));
      }
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
): Promise<{ success: boolean; orderId?: string }> {
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

  // Classic Fallback
  if (json.code === '40084' || json.code === '40404') {
    const isFutures = payload.category !== 'SPOT';
    const v2Path = isFutures ? '/api/v2/mix/order/cancel-order' : '/api/v2/spot/trade/cancel-order';
    const v2Payload: Record<string, unknown> = isFutures
      ? {
          symbol: payload.symbol,
          productType: payload.category,
          orderId: payload.orderId,
          clientOid: payload.clientOid,
        }
      : {
          symbol: payload.symbol,
          orderId: payload.orderId,
          clientOid: payload.clientOid,
        };

    const v2Headers = getAuthHeaders('POST', v2Path, '', v2Payload);
    const v2Res = await fetch(`${BITGET_REST_BASE}${v2Path}`, {
      method: 'POST',
      headers: v2Headers,
      body: JSON.stringify(v2Payload),
    });
    const v2Json = (await v2Res.json()) as { code: string; msg: string; data?: { orderId?: string } };

    if (v2Json.code === '00000' || v2Json.code === '0') {
      return {
        success: true,
        orderId: v2Json.data?.orderId || params.orderId,
      };
    }

    const v2Err = classifyBitgetError(v2Json.code, v2Json.msg);
    throw new Error(`Bitget Cancel Order failed [${v2Json.code}]: ${v2Err.message}. ${v2Err.actionableGuidance}`);
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

  // Classic Fallback
  if (json.code === '40084' || json.code === '40404') {
    const isFutures = payload.category !== 'SPOT';
    const v2Path = isFutures ? '/api/v2/mix/order/cancel-symbol-order' : '/api/v2/spot/trade/cancel-symbol-order';
    const v2Payload: Record<string, unknown> = isFutures
      ? {
          symbol: payload.symbol,
          productType: payload.category,
        }
      : {
          symbol: payload.symbol,
        };

    const v2Headers = getAuthHeaders('POST', v2Path, '', v2Payload);
    const v2Res = await fetch(`${BITGET_REST_BASE}${v2Path}`, {
      method: 'POST',
      headers: v2Headers,
      body: JSON.stringify(v2Payload),
    });
    const v2Json = (await v2Res.json()) as { code: string; msg: string };

    if (v2Json.code === '00000' || v2Json.code === '0') {
      return {
        success: true,
      };
    }

    const v2Err = classifyBitgetError(v2Json.code, v2Json.msg);
    throw new Error(`Bitget Cancel Symbol Orders failed [${v2Json.code}]: ${v2Err.message}. ${v2Err.actionableGuidance}`);
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
