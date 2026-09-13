import { normalizeSymbol } from '../symbols';
import { toV3Category, type BitgetV3Category, type BitgetV3OrderParams, type BitgetV3CancelParams } from '../types';

export interface V3PlaceOrderPayload {
  category: BitgetV3Category;
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  qty: string;
  price?: string;
  posSide?: 'long' | 'short' | 'net';
  reduceOnly?: 'YES' | 'NO';
  marginMode?: 'crossed' | 'isolated';
  timeInForce?: 'gtc' | 'ioc' | 'fok' | 'post_only';
  clientOid?: string;
  stopLoss?: string;
  takeProfit?: string;
  tpTriggerBy?: 'market' | 'mark';
  slTriggerBy?: 'market' | 'mark';
  tpOrderType?: 'limit' | 'market';
  slOrderType?: 'limit' | 'market';
}


export interface V3CancelOrderPayload {
  category: BitgetV3Category;
  symbol: string;
  orderId?: string;
  clientOid?: string;
}

export interface V3BatchCancelPayload {
  category: BitgetV3Category;
  symbol: string;
}

export interface V3ClosePositionPayload {
  category: BitgetV3Category;
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market';
  qty?: string;
  posSide?: 'long' | 'short' | 'net';
  marginMode?: 'crossed' | 'isolated';
  reduceOnly?: 'YES';
  clientOid?: string;
}

/**
 * Pure builder for Bitget v3 UTA Place Order request payload
 */
export function buildPlaceOrderPayload(params: BitgetV3OrderParams): V3PlaceOrderPayload {
  const symbol = normalizeSymbol(params.symbol);
  const category = toV3Category(params.category);
  const isSpot = category === 'SPOT';

  // Determine posSide: in Spot = 'net'. In Futures Hedge Mode: buy = 'long', sell = 'short' unless specified.
  let posSide = params.posSide;
  if (!posSide) {
    if (isSpot) {
      posSide = 'net';
    } else if (params.tradeSide === 'close') {
      posSide = params.side === 'buy' ? 'short' : 'long';
    } else {
      posSide = params.side === 'buy' ? 'long' : 'short';
    }
  }

  const rawReduceOnly = (params as { reduceOnly?: boolean | string }).reduceOnly;
  const isReduceOnly =
    params.tradeSide === 'close' ||
    rawReduceOnly === true ||
    (typeof rawReduceOnly === 'string' && rawReduceOnly.toUpperCase() === 'YES');

  const payload: V3PlaceOrderPayload = {
    category,
    symbol,
    side: params.side,
    orderType: params.orderType,
    qty: params.size ?? (params as { qty?: string }).qty,
    clientOid: params.clientOid || `argus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };

  if (params.price && params.orderType === 'limit') {
    payload.price = params.price;
  }

  if (!isSpot) {
    payload.posSide = posSide;
    // In Hedge Mode (posSide = 'long' | 'short'), Bitget UTA v3 strictly forbids reduceOnly alongside posSide (Error 25238).
    // Only pass reduceOnly in One-Way mode (posSide = 'net')
    if (posSide === 'net' && isReduceOnly) {
      payload.reduceOnly = 'YES';
    }
    payload.marginMode = params.marginMode || 'crossed';
  }

  payload.timeInForce = params.timeInForce || 'gtc';

  // Bitget V3 Preset Stop-Loss and Take-Profit
  // UTA v3 root fields are `stopLoss` / `takeProfit` (Classic v2 names: presetStopLossPrice / presetTakeProfitPrice).
  const slPrice = params.stopLossPrice || params.presetStopLossPrice || params.stopLoss?.triggerPrice;
  if (slPrice && parseFloat(slPrice) > 0) {
    payload.stopLoss = slPrice;
    payload.slOrderType = params.slOrderType || 'market';
    if (params.stopLoss?.triggerType === 'mark_price') {
      payload.slTriggerBy = 'mark';
    }
  }

  const tpPrice = params.takeProfitPrice || params.presetTakeProfitPrice || params.takeProfit?.triggerPrice;
  if (tpPrice && parseFloat(tpPrice) > 0) {
    payload.takeProfit = tpPrice;
    payload.tpOrderType = params.tpOrderType || 'market';
    if (params.takeProfit?.triggerType === 'mark_price') {
      payload.tpTriggerBy = 'mark';
    }
  }

  return payload;
}


/**
 * Pure builder for Bitget v3 UTA Cancel Order request payload
 */
export function buildCancelPayload(params: BitgetV3CancelParams): V3CancelOrderPayload {
  return {
    category: toV3Category(params.category),
    symbol: normalizeSymbol(params.symbol),
    orderId: params.orderId,
    clientOid: params.clientOid,
  };
}

/**
 * Pure builder for Bitget v3 UTA Batch Cancel (by Symbol) request payload
 */
export function buildBatchCancelPayload(symbol: string, category?: string): V3BatchCancelPayload {
  return {
    category: toV3Category(category),
    symbol: normalizeSymbol(symbol),
  };
}

/**
 * Pure builder for Bitget v3 UTA Close Position (Market Reduce-Only) payload
 */
export function buildClosePositionsPayload(
  symbol: string,
  category: string,
  side: 'buy' | 'sell',
  size?: string,
  posSide: 'long' | 'short' | 'net' = 'net',
  marginMode?: 'crossed' | 'isolated'
): V3ClosePositionPayload {
  const normCategory = toV3Category(category);
  const normSymbol = normalizeSymbol(symbol);

  const payload: V3ClosePositionPayload = {
    category: normCategory,
    symbol: normSymbol,
    side,
    orderType: 'market',
    qty: size,
    posSide: normCategory === 'SPOT' ? 'net' : posSide,
    clientOid: `close_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  };

  // Carry the position's own marginMode; an isolated close must not default to crossed.
  if (normCategory !== 'SPOT' && marginMode) {
    payload.marginMode = marginMode;
  }

  // Only pass reduceOnly when posSide is 'net' (One-Way mode) to avoid Bitget error 25238
  if (payload.posSide === 'net' && normCategory !== 'SPOT') {
    payload.reduceOnly = 'YES';
  }

  return payload;
}
