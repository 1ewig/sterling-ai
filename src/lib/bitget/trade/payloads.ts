import { normalizeSymbol } from '../symbols';
import { toV3Category, type BitgetV3Category, type BitgetV3OrderParams, type BitgetV3ModifyParams, type BitgetV3CancelParams } from '../types';

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
  price?: string;
  qty?: string;
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
  qty?: string;
  size?: string;
  posSide?: 'long' | 'short' | 'net';
  reduceOnly: 'YES';
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

  const isReduceOnly = params.reduceOnly === true || params.tradeSide === 'close';

  const payload: V3PlaceOrderPayload = {
    category,
    symbol,
    side: params.side,
    orderType: params.orderType,
    qty: params.size,
    clientOid: params.clientOid || `argus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };

  if (params.price && params.orderType === 'limit') {
    payload.price = params.price;
  }

  if (!isSpot) {
    payload.posSide = posSide;
    if (isReduceOnly) {
      payload.reduceOnly = 'YES';
    }
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
  };

  if (params.newPrice) {
    payload.price = params.newPrice;
  }
  if (params.newSize) {
    payload.qty = params.newSize;
  }
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
    qty: size,
    size,
    posSide: normCategory === 'SPOT' ? 'net' : posSide,
    reduceOnly: 'YES',
    clientOid: `close_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  };
}
