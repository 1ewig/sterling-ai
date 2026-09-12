import { BITGET_REST_BASE } from '../rest';
import { normalizeSymbol } from '../symbols';
import { getAuthHeaders } from '../auth/signer';
import { classifyBitgetError } from '../auth/errors';
import type {
  BitgetV3OrderParams,
  BitgetV3OrderResponse,
  BitgetV3ModifyParams,
  BitgetV3CancelParams,
} from '../types';

/**
 * Submit an order using Bitget UTA (v3) with Classic (v2) fallback
 */
export async function placeOrderV3(
  params: BitgetV3OrderParams
): Promise<BitgetV3OrderResponse> {
  const path = '/api/v3/trade/place-order';
  const sym = normalizeSymbol(params.symbol);

  const payload: Record<string, unknown> = {
    symbol: sym,
    category: params.category || 'usdt-futures',
    side: params.side,
    orderType: params.orderType,
    size: params.size,
    price: params.price,
    tradeSide: params.tradeSide || 'open',
    marginMode: params.marginMode || 'crossed',
    marginCoin: params.marginCoin || 'USDT',
    timeInForce: params.timeInForce || 'gtc',
    clientOid: params.clientOid || `argus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };

  if (params.presetStopLossPrice) {
    payload.presetStopLossPrice = params.presetStopLossPrice;
    payload.slOrderType = 'market';
  }

  if (params.presetTakeProfitPrice) {
    payload.presetTakeProfitPrice = params.presetTakeProfitPrice;
    payload.tpOrderType = 'market';
  }

  try {
    const headers = getAuthHeaders('POST', path, '', payload);
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
        clientOid: json.data?.clientOid || (payload.clientOid as string),
        symbol: sym,
        category: payload.category as string,
        status: 'submitted',
      };
    }

    // Classic Account Fallback (Code 40084 or 40404)
    if (json.code === '40084' || json.code === '40404') {
      const isFutures = (payload.category as string) !== 'spot';
      const v2Path = isFutures ? '/api/v2/mix/order/place-order' : '/api/v2/spot/trade/place-order';
      const v2Payload: Record<string, unknown> = isFutures
        ? {
            symbol: sym,
            productType: 'USDT-FUTURES',
            marginCoin: 'USDT',
            marginMode: params.marginMode || 'crossed',
            side: params.side,
            tradeSide: params.tradeSide || 'open',
            orderType: params.orderType,
            size: params.size,
            price: params.price,
            clientOid: payload.clientOid,
            presetStopLossPrice: params.presetStopLossPrice,
            presetTakeProfitPrice: params.presetTakeProfitPrice,
          }
        : {
            symbol: sym,
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
          clientOid: v2Json.data?.clientOid || (payload.clientOid as string),
          symbol: sym,
          category: payload.category as string,
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
 * Modify an active in-flight order on Bitget
 */
export async function modifyOrderV3(
  params: BitgetV3ModifyParams
): Promise<{ success: boolean; orderId?: string }> {
  const path = '/api/v3/trade/modify-order';
  const sym = normalizeSymbol(params.symbol);

  const payload: Record<string, unknown> = {
    symbol: sym,
    category: params.category || 'usdt-futures',
    orderId: params.orderId,
    clientOid: params.clientOid,
    newPrice: params.newPrice,
    newSize: params.newSize,
  };

  const headers = getAuthHeaders('POST', path, '', payload);
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
  const sym = normalizeSymbol(params.symbol);

  const payload: Record<string, unknown> = {
    symbol: sym,
    category: params.category || 'usdt-futures',
    orderId: params.orderId,
    clientOid: params.clientOid,
  };

  const headers = getAuthHeaders('POST', path, '', payload);
  const response = await fetch(`${BITGET_REST_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as { code: string; msg: string; data?: { orderId?: string } };

  if (json.code !== '00000' && json.code !== '0') {
    const err = classifyBitgetError(json.code, json.msg);
    throw new Error(`Bitget Cancel Order failed [${json.code}]: ${err.message}. ${err.actionableGuidance}`);
  }

  return {
    success: true,
    orderId: json.data?.orderId || params.orderId,
  };
}
