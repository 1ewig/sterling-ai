import { BITGET_REST_BASE } from '../rest';
import { getAuthHeaders } from '../auth/signer';
import { classifyBitgetError } from '../auth/errors';
import {
  buildPlaceOrderPayload,
  buildModifyPayload,
  buildCancelPayload,
  buildBatchCancelPayload,
  buildClosePositionsPayload,
} from './payloads';
import type {
  BitgetV3OrderParams,
  BitgetV3OrderResponse,
  BitgetV3ModifyParams,
  BitgetV3CancelParams,
} from '../types';

// Re-export query interfaces and functions for full backward compatibility
export * from './queries';

/**
 * Submit an order using Bitget UTA (v3)
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
  posSide: 'long' | 'short' | 'net' = 'net',
  marginMode?: 'crossed' | 'isolated'
): Promise<BitgetV3OrderResponse> {
  const payload = buildClosePositionsPayload(symbol, categoryInput, side, size, posSide, marginMode);
  return placeOrderV3(payload as unknown as BitgetV3OrderParams);
}
