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
  // ---- Enriched UTA v3 order fields (from unfilled-orders / order-info responses)
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
  /** Verbatim orderStatus string from the response (before normalization) */
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

export interface BitgetV3Position {
  symbol: string;
  posSide: 'long' | 'short' | 'net';
  total: string;
  available: string;
  frozen?: string;
  avgPrice: string;
  markPrice: string;
  liquidationPrice: string;
  leverage: string | number;
  unrealisedPnl: string;
  profitRate?: string;
  mmr: string;
  breakEvenPrice?: string;
  marginMode: 'crossed' | 'isolated';
  holdMode?: 'single_hold' | 'double_hold';
  positionStatus?: 'normal' | 'liquidation';
  cTime?: string;
  uTime?: string;
  // Compatibility fields for legacy consumers
  openPriceAvg?: string;
  unrealizedPL?: string;
  holdSide?: 'long' | 'short' | 'net';
  marginCoin?: string;
  margin?: string;
  marginRate?: string;
  locked?: string;
}

export interface BitgetAccountSource {
  ok: boolean;
  error?: BitgetErrorDetails;
}

export interface BitgetAssetBalance {
  coin: string;
  equity: number;
  usdValue: number;
  balance: number;
  available: number;
  locked: number;
}

export interface BitgetAccountOverview {
  totalEquityUsdt: number;
  /** USDT-denominated equity (assets.usdtEquity) */
  usdtEquityUsdt?: number;
  availableEquityUsdt: number;
  unrealizedPnlUsdt: number;
  marginRatioPercent: number;
  /** assets.positionMgnRatio as percent */
  positionMgnRatioPercent?: number;
  /** Raw UTA account mode: unified | hybrid | upgrading | switching */
  accountMode: string;
  /** Account level: basic | advanced | isolated | delta */
  accountLevel?: string;
  /** Holding mode: one_way_mode | hedge_mode — determines posSide/reduceOnly placement rules */
  holdMode?: 'one_way_mode' | 'hedge_mode';
  assetMode?: string;
  stpMode?: string;
  effEquityUsdt?: number;
  positionValueUsdt?: number;
  positions: BitgetV3Position[];
  positionsByCategory?: Record<string, BitgetV3Position[]>;
  /** Spot & Collateral coin balances */
  assets?: BitgetAssetBalance[];
  /** Per-source diagnostics so partial failures degrade gracefully instead of throwing */
  sources?: {
    settings: BitgetAccountSource;
    assets: BitgetAccountSource;
    positions: BitgetAccountSource;
  };
  warnings?: string[];
}

export type BitgetErrorCategory =
  | 'MISSING_CREDENTIALS'
  | 'AUTH_FAILED'
  | 'IP_BLOCKED'
  | 'INSUFFICIENT_FUNDS'
  | 'ORDER_INVALID'
  | 'RATE_LIMITED'
  | 'ORDER_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'LEVERAGE_EXCEEDED'
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
  category: z
    .enum(['all', 'spot', 'usdt-futures', 'coin-futures', 'usdc-futures'])
    .default('all')
    .describe('Scope of account overview to query. "all" aggregates USDT/COIN/USDC futures positions; spot holdings are reported via account assets.'),
});
