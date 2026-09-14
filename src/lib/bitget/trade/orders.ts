import { safeGetJson } from './fetch';
import { classifyBitgetError } from '../auth/errors';
import {
  buildPlaceOrderPayload,
  buildCancelPayload,
  buildBatchCancelPayload,
  buildClosePositionsPayload,
} from './payloads';
import type {
  BitgetV3OrderParams,
  BitgetV3OrderResponse,
  BitgetV3CancelParams,
} from '../types';

import { toV3Category } from '../types';
import { fetchBitgetTicker } from '../rest';

/**
 * Submit an order using Bitget UTA (v3)
 */
export async function placeOrderV3(
  params: BitgetV3OrderParams
): Promise<BitgetV3OrderResponse> {
  const category = toV3Category(params.category);
  const isSpot = category === 'SPOT';

  let resolvedParams = params;
  if (
    isSpot &&
    resolvedParams.orderType === 'market' &&
    resolvedParams.side === 'buy' &&
    (!resolvedParams.price || parseFloat(resolvedParams.price) <= 0)
  ) {
    try {
      const ticker = await fetchBitgetTicker(resolvedParams.symbol, false);
      if (ticker?.lastPr && parseFloat(ticker.lastPr) > 0) {
        resolvedParams = { ...resolvedParams, price: ticker.lastPr };
      }
    } catch {
      // Fall back to original params
    }
  }

  const path = '/api/v3/trade/place-order';
  const payload = buildPlaceOrderPayload(resolvedParams);
  const result = await safeGetJson('POST', path, '', payload as unknown as Record<string, unknown>);

  if (result.ok && result.json) {
    const data = result.json.data as { orderId?: string; clientOid?: string } | undefined;
    return {
      orderId: data?.orderId || '',
      clientOid: data?.clientOid || payload.clientOid,
      symbol: payload.symbol,
      category: payload.category,
      status: 'submitted',
    };
  }

  const err = result.error ?? classifyBitgetError(result.json?.code ?? '0', result.json?.msg);
  throw new Error(`Bitget Place Order failed [${err.code || result.httpStatus}]: ${err.message}. ${err.actionableGuidance}`);
}

/**
 * Cancel an open order on Bitget
 */
export async function cancelOrderV3(
  params: BitgetV3CancelParams
): Promise<{ success: boolean; orderId?: string; alreadyTerminal?: boolean; message?: string }> {
  const path = '/api/v3/trade/cancel-order';
  const payload = buildCancelPayload(params);
  const result = await safeGetJson('POST', path, '', payload as unknown as Record<string, unknown>);

  if (result.ok) {
    const data = result.json?.data as { orderId?: string } | undefined;
    return {
      success: true,
      orderId: data?.orderId || params.orderId,
    };
  }

  // 25204: Order does not exist (already filled or cancelled)
  if (result.json?.code === '25204') {
    return {
      success: true,
      orderId: params.orderId,
      alreadyTerminal: true,
      message: 'Order does not exist on exchange (already filled or cancelled).',
    };
  }

  const err = result.error ?? classifyBitgetError(result.json?.code ?? '0', result.json?.msg);
  throw new Error(`Bitget Cancel Order failed [${err.code || result.httpStatus}]: ${err.message}. ${err.actionableGuidance}`);
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
  const result = await safeGetJson('POST', path, '', payload as unknown as Record<string, unknown>);

  if (result.ok) {
    return {
      success: true,
    };
  }

  const err = result.error ?? classifyBitgetError(result.json?.code ?? '0', result.json?.msg);
  throw new Error(`Bitget Cancel Symbol Orders failed [${err.code || result.httpStatus}]: ${err.message}. ${err.actionableGuidance}`);
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

