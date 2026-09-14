/**
 * Market, Ticker, Candlestick & WebSocket Stream Types
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

export interface BitgetWsArg {
  instType: 'spot' | 'usdt-futures' | 'SPOT' | 'USDT-FUTURES';
  topic?: 'ticker' | 'books' | 'books15' | 'candle1m';
  channel?: 'ticker' | 'books' | 'books15' | 'candle1m';
  symbol?: string;
  instId?: string;
}

export interface MicroCandle {
  timestamp: number;
  close: number;
  high: number;
  low: number;
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
