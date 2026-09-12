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
  lastPr: string;
  open24h: string;
  high24h: string;
  low24h: string;
  change24h: string;
  bidPr?: string;
  askPr?: string;
  bidSz?: string;
  askSz?: string;
  baseVolume?: string;
  quoteVolume?: string;
  fundingRate?: string;
  nextFundingTime?: string;
  markPrice?: string;
  indexPrice?: string;
  holdingAmount?: string;
  ts?: string;
}

/**
 * Bitget WebSocket Orderbook Depth Frame
 */
export interface BitgetWsBookData {
  asks: [price: string, size: string][];
  bids: [price: string, size: string][];
  ts?: string;
}

/**
 * Bitget WebSocket Envelope
 */
export interface BitgetWsMessage<T> {
  action?: 'snapshot' | 'update';
  arg?: {
    instType: 'SPOT' | 'USDT-FUTURES';
    channel: string;
    instId: string;
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
 * Calculated Technical Indicator Result
 */
export interface TechnicalIndicatorReport {
  symbol: string;
  granularity: string;
  currentPrice: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  indicators: {
    rsi14: number;
    rsiSignal: 'overbought' | 'oversold' | 'neutral';
    macd: {
      dif: number;
      dea: number;
      hist: number;
      signal: 'bullish_cross' | 'bearish_cross' | 'bullish_momentum' | 'bearish_momentum' | 'neutral';
    };
    ema: {
      ema20: number;
      ema50: number;
      ema200?: number;
      alignment: 'bullish' | 'bearish' | 'mixed';
    };
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
      bandwidth: number;
      position: 'above_upper' | 'below_lower' | 'inside';
    };
    superTrend: {
      value: number;
      direction: 'bullish' | 'bearish';
    };
    fibonacci: {
      high: number;
      low: number;
      fib236: number;
      fib382: number;
      fib500: number;
      fib618: number;
      fib786: number;
      currentZone: string;
    };
    atr14: number;
  };
  summary: string;
}

/**
 * Macro Analyst Intelligence Payload
 */
export interface MacroAnalystData {
  verdict: 'RISK-ON' | 'MIXED' | 'RISK-OFF';
  rates: {
    fedFundsTarget?: string;
    t2y?: string;
    t10y?: string;
    spread10y2y?: string;
    yieldCurveInverted?: boolean;
    mortgage30y?: string;
  };
  indicators: {
    cpi?: string;
    corePce?: string;
    unemployment?: string;
    gdpGrowth?: string;
    nonfarmPayrolls?: string;
  };
  correlations: {
    btcGold?: string;
    btcDxy?: string;
    btcNdx?: string;
    btcSpx?: string;
  };
  globalPrices: {
    dxy?: string;
    vix?: string;
    spx?: string;
    ndx?: string;
    gold?: string;
  };
  upcomingCatalysts?: string[];
  summary: string;
}

/**
 * Sentiment Analyst Intelligence Payload
 */
export interface SentimentAnalystData {
  fearAndGreedIndex: {
    current: number;
    sentiment: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
    historicalAvg14d?: number;
  };
  derivatives: {
    symbol: string;
    retailLongShortRatio?: number;
    topTraderLongShortRatio?: number;
    divergence?: 'Smart money long, retail short' | 'Retail long, smart money short' | 'Aligned Long' | 'Aligned Short' | 'Balanced';
    takerBuyRatio?: number;
    openInterest?: string;
    fundingRate?: string;
  };
  positioningRisk: 'High Squeeze Risk' | 'Overleveraged Bulls' | 'Overleveraged Bears' | 'Moderate / Balanced';
  summary: string;
}

/**
 * Market Intelligence Payload
 */
export interface MarketIntelData {
  defi: {
    totalTvl?: string;
    topChains?: Array<{ name: string; tvl: string; share: string }>;
    stablecoinSupply?: string;
  };
  dexTrending?: Array<{
    symbol: string;
    name: string;
    price: string;
    change24h: string;
    volume24h?: string;
    chain?: string;
  }>;
  networkHealth?: {
    ethGasGwei?: number;
    btcHalfHourFeeSat?: number;
    btcPendingTx?: number;
  };
  summary: string;
}

/**
 * Zod schemas for tool parameters
 */
export const marketDataParamsSchema = z.object({
  symbol: z.string().describe('Trading pair symbol, e.g. BTCUSDT, ETHUSDT, TSLAUSDT, NVDAUSDT, SPYUSDT'),
  productType: z.enum(['spot', 'usdt-futures']).default('usdt-futures').describe('Product market type (spot or usdt-futures)'),
});

export const technicalAnalysisParamsSchema = z.object({
  symbol: z.string().default('BTCUSDT').describe('Trading pair symbol (e.g. BTCUSDT, ETHUSDT, TSLAUSDT)'),
  granularity: z.enum(['15min', '1h', '4h', '1d', '1w']).default('4h').describe('Candlestick timeframe'),
  limit: z.number().min(30).max(200).default(100).describe('Number of candlestick bars to analyze (default 100)'),
});

export const macroAnalystParamsSchema = z.object({
  focus: z.enum(['full', 'yield_curve', 'inflation_jobs', 'cross_asset', 'tech_earnings']).default('full').describe('Specific macro focus area or full overview'),
});

export const sentimentAnalystParamsSchema = z.object({
  symbol: z.string().default('BTCUSDT').describe('Trading pair symbol for derivatives positioning (e.g. BTCUSDT, ETHUSDT, SOLUSDT)'),
  timeframe: z.enum(['1h', '4h', '1d']).default('4h').describe('Lookback window for Long/Short and Taker ratios'),
});

export const marketIntelParamsSchema = z.object({
  scope: z.enum(['all', 'defi_tvl', 'dex_trending', 'network_health', 'stablecoins']).default('all').describe('Market intelligence dimension to query'),
});

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

export const stageTradeOrderParamsSchema = z.object({
  symbol: z.string().describe('Trading pair symbol (e.g. BTCUSDT, ETHUSDT, RTSLAUSDT, SOLUSDT)'),
  category: z.enum(['spot', 'usdt-futures', 'coin-futures', 'usdc-futures']).default('usdt-futures').describe('Market category'),
  side: z.enum(['buy', 'sell']).describe('Order direction (buy = long, sell = short)'),
  orderType: z.enum(['limit', 'market']).default('limit').describe('Order execution type'),
  size: z.number().positive().describe('Order size / quantity in base asset units (e.g. 0.05 BTC or 2.0 TSLA)'),
  price: z.number().positive().optional().describe('Limit price (required for limit orders)'),
  tradeSide: z.enum(['open', 'close']).default('open').describe('Position intent: open new position or close existing'),
  leverage: z.number().min(1).max(50).default(5).optional().describe('Leverage multiple (for futures)'),
  stopLossPrice: z.number().positive().optional().describe('Preset Stop-Loss price level'),
  takeProfitPrice: z.number().positive().optional().describe('Preset Take-Profit price level'),
  rationale: z.string().optional().describe('Short trading rationale or catalyst for this setup'),
});

export const accountOverviewParamsSchema = z.object({
  category: z.enum(['all', 'spot', 'usdt-futures']).default('all').describe('Scope of account overview to query'),
});


