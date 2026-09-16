import { safeGetJson } from './fetch';
import { classifyBitgetError } from '../auth/errors';
import type { BitgetCredentials } from '../auth/signer';
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
import { normalizeSymbol } from '../symbols';
import { getPositionsV3 } from './positions';
import { getInstrument, snapQtyToStep } from './instruments';

/**
 * Submit an order using Bitget UTA (v3)
 */
export async function placeOrderV3(
  params: BitgetV3OrderParams,
  credentials?: BitgetCredentials
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
  const result = await safeGetJson('POST', path, '', payload as unknown as Record<string, unknown>, false, credentials);

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
  params: BitgetV3CancelParams,
  credentials?: BitgetCredentials
): Promise<{ success: boolean; orderId?: string; alreadyTerminal?: boolean; message?: string }> {
  const path = '/api/v3/trade/cancel-order';
  const payload = buildCancelPayload(params);
  const result = await safeGetJson('POST', path, '', payload as unknown as Record<string, unknown>, false, credentials);

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
 * Batch cancel all open orders for a specific symbol
 */
export async function cancelSymbolOrdersV3(
  symbol: string,
  categoryInput?: string,
  credentials?: BitgetCredentials
): Promise<{ success: boolean; count?: number }> {
  const path = '/api/v3/trade/cancel-symbol-order';
  const payload = buildBatchCancelPayload(symbol, categoryInput);
  const result = await safeGetJson('POST', path, '', payload as unknown as Record<string, unknown>, false, credentials);

  if (result.ok) {
    return {
      success: true,
    };
  }

  const err = result.error ?? classifyBitgetError(result.json?.code ?? '0', result.json?.msg);
  throw new Error(`Bitget Cancel Symbol Orders failed [${err.code || result.httpStatus}]: ${err.message}. ${err.actionableGuidance}`);
}

/**
 * Market close a position via reduce-only order.
 * If size is omitted, automatically inspects active positions, resolves tradable size,
 * and snaps quantity to the instrument's step size.
 */
export async function closePositionsV3(
  symbol: string,
  categoryInput: string,
  side: 'buy' | 'sell',
  size?: string,
  posSide: 'long' | 'short' | 'net' = 'net',
  marginMode?: 'crossed' | 'isolated',
  credentials?: BitgetCredentials
): Promise<BitgetV3OrderResponse> {
  let resolvedSize = size;
  let resolvedPosSide = posSide;
  let resolvedMarginMode = marginMode;

  // Defensive resolution: if size is omitted or empty, resolve from active position
  if (!resolvedSize || parseFloat(resolvedSize) <= 0) {
    try {
      const positions = await getPositionsV3(categoryInput, credentials);
      const normSym = normalizeSymbol(symbol);
      const targetPos = positions.find(
        (p) =>
          normalizeSymbol(p.symbol) === normSym &&
          (posSide === 'net' || !p.posSide || p.posSide === posSide)
      );

      if (targetPos) {
        if (!resolvedMarginMode && targetPos.marginMode) {
          resolvedMarginMode = targetPos.marginMode;
        }
        if (resolvedPosSide === 'net' && targetPos.posSide) {
          resolvedPosSide = targetPos.posSide;
        }
        const tradableQty =
          parseFloat(targetPos.available || '0') > 0
            ? targetPos.available
            : targetPos.total;

        if (tradableQty && parseFloat(tradableQty) > 0) {
          try {
            const inst = await getInstrument(symbol, categoryInput);
            resolvedSize = snapQtyToStep(parseFloat(tradableQty), inst).toString();
          } catch {
            resolvedSize = tradableQty;
          }
        }
      }
    } catch {
      // Fall back to original params if live position lookup fails
    }
  }

  if (!resolvedSize || parseFloat(resolvedSize) <= 0) {
    throw new Error(
      `Cannot close position for ${symbol}: no active or tradable position found to close.`
    );
  }

  const payload = buildClosePositionsPayload(
    symbol,
    categoryInput,
    side,
    resolvedSize,
    resolvedPosSide,
    resolvedMarginMode
  );
  return placeOrderV3(payload as unknown as BitgetV3OrderParams, credentials);
}
