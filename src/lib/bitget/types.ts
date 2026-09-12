import { z } from 'zod';

/**
 * Bitget Market Ticker
 */
export interface BitgetTicker {
  symbol: string;
  lastPr: string;
  high24h: string;
  low24h: string;
  change24h: string;
  usdtVolume?: string;
  baseVolume?: string;
  quoteVolume?: string;
  openUtc?: string;
  ts?: string;
}

/**
 * Bitget WebSocket Ticker Frame
 */
export interface BitgetWsTickerData {
  instId: string;
  symbol?: string;
  lastPr: string;
  lastPrice?: string;
  open24h?: string;
  openPrice24h?: string;
  high24h: string;
  highPrice24h?: string;
  low24h: string;
  lowPrice24h?: string;
  change24h: string;
  price24hPcnt?: string;
  bidPr?: string;
  bid1Price?: string;
  askPr?: string;
  ask1Price?: string;
  bidSz?: string;
  bid1Size?: string;
  askSz?: string;
  ask1Size?: string;
  baseVolume?: string;
  volume24h?: string;
  quoteVolume?: string;
  turnover24h?: string;
  fundingRate?: string;
  nextFundingTime?: string;
  markPrice?: string;
  indexPrice?: string;
  holdingAmount?: string;
  openInterest?: string;
  ts?: string;
}


/**
 * Bitget WebSocket Orderbook Depth Frame
 */
export interface BitgetWsBookData {
  asks: [price: string, size: string][];
  bids: [price: string, size: string][];
  a?: [price: string, size: string][];
  b?: [price: string, size: string][];
  ts?: string;
}

/**
 * Bitget WebSocket Envelope
 */
export interface BitgetWsMessage<T> {
  action?: 'snapshot' | 'update';
  arg?: {
    instType?: string;
    topic?: string;
    channel?: string;
    symbol?: string;
    instId?: string;
  };
  data?: T[];
  event?: string;
  code?: number;
  msg?: string;
  ts?: number;
}


/**
 * Normalized Candlestick (OHLCV) Bar
 */
export interface KlineCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
}

/**
 * Funding Rate Data
 */
export interface FundingRateInfo {
  symbol: string;
  fundingRate: string;
  fundingRateInterval: string;
  nextUpdate?: string;
  minFundingRate?: string;
  maxFundingRate?: string;
}

/**
 * Open Interest Data
 */
export interface OpenInterestInfo {
  symbol: string;
  size: string;
  timestamp?: string;
}

/**
 * Orderbook Depth Snapshot
 */
export interface OrderbookDepth {
  symbol: string;
  asks: [price: string, size: string][];
  bids: [price: string, size: string][];
  timestamp?: string;
}

/**
 * Bitget v3 Unified Trading Account (UTA) Types
 */
export interface BitgetV3OrderParams {
  symbol: string;
  category: 'spot' | 'usdt-futures' | 'coin-futures' | 'usdc-futures';
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  size: string;
  price?: string;
  tradeSide?: 'open' | 'close';
  marginMode?: 'crossed' | 'isolated';
  marginCoin?: string;
  timeInForce?: 'gtc' | 'ioc' | 'fok' | 'post_only';
  clientOid?: string;
  presetStopLossPrice?: string;
  presetTakeProfitPrice?: string;
  slOrderType?: 'market';
  tpOrderType?: 'market';
}

export interface BitgetV3ModifyParams {
  symbol: string;
  category: 'spot' | 'usdt-futures' | 'coin-futures' | 'usdc-futures';
  orderId?: string;
  clientOid?: string;
  newPrice?: string;
  newSize?: string;
}

export interface BitgetV3CancelParams {
  symbol: string;
  category: 'spot' | 'usdt-futures' | 'coin-futures' | 'usdc-futures';
  orderId?: string;
  clientOid?: string;
}

export interface BitgetV3OrderResponse {
  orderId: string;
  clientOid?: string;
  symbol: string;
  category: string;
  status?: string;
}

export interface BitgetV3Position {
  symbol: string;
  marginCoin: string;
  holdSide: 'long' | 'short' | 'net';
  total: string;
  available: string;
  locked: string;
  margin: string;
  leverage: number;
  openPriceAvg: string;
  markPrice: string;
  liquidationPrice: string;
  unrealizedPL: string;
  marginRate: string;
  marginMode: 'crossed' | 'isolated';
  cTime: string;
}

export interface BitgetAccountOverview {
  totalEquityUsdt: number;
  availableEquityUsdt: number;
  unrealizedPnlUsdt: number;
  marginRatioPercent: number;
  accountMode: 'basic' | 'advanced' | 'isolated';
  positions: BitgetV3Position[];
}

export type BitgetErrorCategory =
  | 'MISSING_CREDENTIALS'
  | 'AUTH_FAILED'
  | 'IP_BLOCKED'
  | 'INSUFFICIENT_FUNDS'
  | 'ORDER_INVALID'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'EXCHANGE_ERROR';

export interface BitgetErrorDetails {
  category: BitgetErrorCategory;
  code?: string;
  message: string;
  actionableGuidance: string;
  canRetry: boolean;
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

export const accountOverviewParamsSchema = z.object({
  category: z.enum(['all', 'spot', 'usdt-futures']).default('all').describe('Scope of account overview to query'),
});
