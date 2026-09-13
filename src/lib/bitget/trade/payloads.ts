import { normalizeSymbol } from '../symbols';
import { toV3Category, type BitgetV3Category, type BitgetV3OrderParams, type BitgetV3ModifyParams, type BitgetV3CancelParams } from '../types';

export interface V3PlaceOrderPayload {
  category: BitgetV3Category;
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  size: string;
  price?: string;
  posSide?: 'long' | 'short' | 'net';
  reduceOnly?: boolean;
  marginMode?: 'crossed' | 'isolated';
  timeInForce?: 'gtc' | 'ioc' | 'fok' | 'post_only';
  clientOid?: string;
  presetStopLossPrice?: string;
  presetTakeProfitPrice?: string;
  stopLoss?: {
    triggerPrice: string;
    executePrice?: string;
    triggerType?: 'mark_price' | 'fill_price';
  };
  takeProfit?: {
    triggerPrice: string;
    executePrice?: string;
    triggerType?: 'mark_price' | 'fill_price';
  };
}

export interface V3ModifyOrderPayload {
  category: BitgetV3Category;
  symbol: string;
  orderId?: string;
  clientOid?: string;
  newPrice?: string;
  newSize?: string;
  autoCancel?: boolean;
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
  size?: string;
  posSide?: 'long' | 'short' | 'net';
  reduceOnly: true;
  clientOid?: string;
}

/**
 * Pure builder for Bitget v3 UTA Place Order request payload
 */
export function buildPlaceOrderPayload(params: BitgetV3OrderParams): V3PlaceOrderPayload {
  const symbol = normalizeSymbol(params.symbol);
  const category = toV3Category(params.category);
  const isSpot = category === 'SPOT';

  // In one-way mode or spot, posSide defaults to 'net'. In hedge mode, long or short.
  const posSide = params.posSide ?? (isSpot ? 'net' : params.tradeSide === 'close' ? 'net' : 'net');
  const reduceOnly = params.reduceOnly ?? (params.tradeSide === 'close');

  const payload: V3PlaceOrderPayload = {
    category,
    symbol,
    side: params.side,
    orderType: params.orderType,
    size: params.size,
    clientOid: params.clientOid || `argus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };

  if (params.price && params.orderType === 'limit') {
    payload.price = params.price;
  }

  if (!isSpot) {
    payload.posSide = posSide;
    payload.reduceOnly = reduceOnly;
    payload.marginMode = params.marginMode || 'crossed';
  }

  payload.timeInForce = params.timeInForce || 'gtc';

  // V3 TP/SL triggers
  if (params.stopLoss) {
    payload.stopLoss = {
      triggerPrice: params.stopLoss.triggerPrice,
      executePrice: params.stopLoss.executePrice || params.stopLoss.triggerPrice,
      triggerType: params.stopLoss.triggerType || 'mark_price',
    };
  } else if (params.presetStopLossPrice) {
    payload.stopLoss = {
      triggerPrice: params.presetStopLossPrice,
      executePrice: params.presetStopLossPrice,
      triggerType: 'mark_price',
    };
  }

  if (params.takeProfit) {
    payload.takeProfit = {
      triggerPrice: params.takeProfit.triggerPrice,
      executePrice: params.takeProfit.executePrice || params.takeProfit.triggerPrice,
      triggerType: params.takeProfit.triggerType || 'mark_price',
    };
  } else if (params.presetTakeProfitPrice) {
    payload.takeProfit = {
      triggerPrice: params.presetTakeProfitPrice,
      executePrice: params.presetTakeProfitPrice,
      triggerType: 'mark_price',
    };
  }

  return payload;
}

/**
 * Pure builder for Bitget v3 UTA Modify Order request payload
 */
export function buildModifyPayload(params: BitgetV3ModifyParams): V3ModifyOrderPayload {
  const symbol = normalizeSymbol(params.symbol);
  const category = toV3Category(params.category);

  const payload: V3ModifyOrderPayload = {
    category,
    symbol,
    orderId: params.orderId,
    clientOid: params.clientOid,
    newPrice: params.newPrice,
    newSize: params.newSize,
  };

  if (params.autoCancel !== undefined) {
    payload.autoCancel = params.autoCancel;
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
  posSide: 'long' | 'short' | 'net' = 'net'
): V3ClosePositionPayload {
  const normCategory = toV3Category(category);
  const normSymbol = normalizeSymbol(symbol);

  return {
    category: normCategory,
    symbol: normSymbol,
    side,
    orderType: 'market',
    size,
    posSide: normCategory === 'SPOT' ? 'net' : posSide,
    reduceOnly: true,
    clientOid: `close_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  };
}
