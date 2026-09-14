import { z } from 'zod';

export type BitgetV3Category = 'SPOT' | 'USDT-FUTURES' | 'COIN-FUTURES' | 'USDC-FUTURES';

export function toV3Category(category?: string): BitgetV3Category {
  if (!category) return 'USDT-FUTURES';
  const upper = category.toUpperCase().trim();
  if (upper === 'SPOT') return 'SPOT';
  if (upper === 'USDT-FUTURES' || upper === 'FUTURES') return 'USDT-FUTURES';
  if (upper === 'COIN-FUTURES') return 'COIN-FUTURES';
  if (upper === 'USDC-FUTURES') return 'USDC-FUTURES';
  return 'USDT-FUTURES';
}

export interface BitgetInstrument {
  symbol: string;
  category: BitgetV3Category;
  baseCoin: string;
  quoteCoin: string;
  minTradeNum: string;
  pricePlace: string;
  volumePlace: string;
  priceMultiplier?: string;
  quantityMultiplier?: string;
  minTradeUSDT?: string;
  maxMarketOrderQty?: string;
  maxLeverage?: string;
  status: string; // 'online' | 'offline' | 'gray'
  buyLimitPriceRatio?: string;
  sellLimitPriceRatio?: string;
}

export interface BitgetV3OrderInfo {
  orderId: string;
  clientOid?: string;
  symbol: string;
  category: BitgetV3Category;
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  price?: string;
  size: string;
  status: 'init' | 'live' | 'new' | 'partially_filled' | 'filled' | 'cancelled';
  baseVolume?: string;
  cumExecQty?: string;
  avgPrice?: string;
  feeDetail?: Array<{ feeCoin: string; fee: string }>;
  cTime?: string;
  uTime?: string;
  /** Order amount, quote-coin units (v3 `amount`) */
  amount?: string;
  /** Cumulative executed value, quote-coin units (v3 `cumExecValue`) */
  cumExecValue?: string;
  /** Position side as reported by the exchange; empty string for spot */
  posSide?: 'long' | 'short' | '';
  /** Account holding mode at order time: one_way_mode vs hedge_mode */
  holdMode?: 'one_way_mode' | 'hedge_mode';
  /** Reduce-only identifier from exchange ('YES'/'NO') */
  reduceOnly?: 'YES' | 'NO';
  timeInForce?: 'gtc' | 'ioc' | 'fok' | 'post_only' | 'rpi';
  /** Margin mode for futures: crossed | isolated */
  marginMode?: 'crossed' | 'isolated';
  /** Delegate type — reveals conditional/plan/stop/strategy vs normal; v3 `delegateType` */
  delegateType?: string;
  /** Trade side: open | close */
  tradeSide?: 'open' | 'close';
  stpMode?: string;
  takeProfit?: string;
  stopLoss?: string;
  tpTriggerBy?: string;
  slTriggerBy?: string;
  tpOrderType?: string;
  slOrderType?: string;
  cancelReason?: string;
  execType?: string;
  rawStatus?: string;
}

/**
 * Bitget v3 Unified Trading Account (UTA) Types
 */
export interface BitgetV3OrderParams {
  symbol: string;
  category: 'spot' | 'usdt-futures' | 'coin-futures' | 'usdc-futures' | BitgetV3Category;
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  size: string;
  price?: string;
  posSide?: 'long' | 'short' | 'net';
  reduceOnly?: boolean;
  tradeSide?: 'open' | 'close';
  marginMode?: 'crossed' | 'isolated';
  marginCoin?: string;
  timeInForce?: 'gtc' | 'ioc' | 'fok' | 'post_only';
  clientOid?: string;
  /** Preset Stop-Loss price (UTA v3 root field `stopLoss`) */
  stopLossPrice?: string;
  /** Preset Take-Profit price (UTA v3 root field `takeProfit`) */
  takeProfitPrice?: string;
  /** @deprecated Legacy Classic v2 alias; use `stopLossPrice` for UTA v3 */
  presetStopLossPrice?: string;
  /** @deprecated Legacy Classic v2 alias; use `takeProfitPrice` for UTA v3 */
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
  slOrderType?: 'market';
  tpOrderType?: 'market';
}

export interface StagedTradeTicketPayload {
  ticketId: string;
  symbol: string;
  category: string;
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  size: number;
  price?: number;
  tradeSide?: 'open' | 'close';
  leverage?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  clientOid: string;
  timestamp: number;
}

export interface StagedActionTicketPayload {
  actionId: string;
  action: 'cancel_order' | 'cancel_symbol' | 'close_position';
  symbol: string;
  category: string;
  orderId?: string;
  clientOid?: string;
  side?: 'buy' | 'sell';
  size?: string;
  posSide?: 'long' | 'short' | 'net';
  marginMode?: 'crossed' | 'isolated';
  timestamp: number;
}

export interface BitgetV3CancelParams {
  symbol: string;
  category: 'spot' | 'usdt-futures' | 'coin-futures' | 'usdc-futures' | BitgetV3Category;
  orderId?: string;
  clientOid?: string;
}

export interface BitgetV3OrderResponse {
  orderId: string;
  clientOid?: string;
  symbol: string;
  category: string;
  status?: string;
  avgPrice?: string;
  cumExecQty?: string;
  feeDetail?: Array<{ feeCoin: string; fee: string }>;
}

export const stageTradeOrderParamsSchema = z.object({
  symbol: z.string().describe('Trading pair symbol (e.g. BTCUSDT, ETHUSDT, RTSLAUSDT, SOLUSDT)'),
  category: z
    .enum(['spot', 'usdt-futures', 'coin-futures', 'usdc-futures'])
    .default('usdt-futures')
    .describe('Market category'),
  side: z
    .enum(['buy', 'sell', 'long', 'short'])
    .describe('Order direction (buy/long = long, sell/short = short)'),
  orderType: z.enum(['limit', 'market']).default('limit').describe('Order execution type'),
  size: z
    .coerce
    .number()
    .positive()
    .describe('Order size / quantity in base asset units (e.g. 0.05 BTC or 2.0 TSLA)'),
  price: z.coerce.number().positive().optional().describe('Limit price (required for limit orders)'),
  tradeSide: z.enum(['open', 'close']).default('open').describe('Position intent: open new position or close existing'),
  leverage: z.coerce.number().min(1).max(50).default(5).optional().describe('Leverage multiple (for futures)'),
  stopLossPrice: z.coerce.number().positive().optional().describe('Preset Stop-Loss price level'),
  takeProfitPrice: z.coerce.number().positive().optional().describe('Preset Take-Profit price level'),
  rationale: z.string().optional().describe('Short trading rationale or catalyst for this setup'),
});
