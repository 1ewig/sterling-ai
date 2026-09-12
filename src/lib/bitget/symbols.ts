const ASSET_ALIASES: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
  XRP: 'XRPUSDT',
  DOGE: 'DOGEUSDT',
  ADA: 'ADAUSDT',
  BNB: 'BNBUSDT',
  AVAX: 'AVAXUSDT',
  LINK: 'LINKUSDT',
  SUI: 'SUIUSDT',
  NEAR: 'NEARUSDT',
  APT: 'APTUSDT',
  TSLA: 'TSLAUSDT',
  NVDA: 'NVDAUSDT',
  SPY: 'SPYUSDT',
  QQQ: 'QQQUSDT',
  AAPL: 'AAPLUSDT',
  MSFT: 'MSFTUSDT',
  AMZN: 'AMZNUSDT',
  GOOGL: 'GOOGLUSDT',
  META: 'METAUSDT',
  COIN: 'COINUSDT',
  MSTR: 'MSTRUSDT',
  GOLD: 'XAUUSDT',
  XAU: 'XAUUSDT',
  SILVER: 'XAGUSDT',
  XAG: 'XAGUSDT',
};

/**
 * Normalizes user and agent symbol strings into standard Bitget trading pairs.
 * Handles suffixes (-PERP, .P, /USDT), lowercase tickers, and commodity/stock aliases.
 */
export function normalizeSymbol(raw: string): string {
  if (!raw || typeof raw !== 'string') return 'BTCUSDT';
  let clean = raw.trim().toUpperCase();

  // Strip common derivatives and punctuation suffixes
  clean = clean
    .replace(/[-_/]?(PERP|USDT|USD|USDC)$/i, '')
    .replace(/\.P$/i, '')
    .replace(/\.D$/i, '')
    .replace(/[^A-Z0-9]/g, '');

  if (!clean) return 'BTCUSDT';

  // Check alias table first
  if (ASSET_ALIASES[clean]) {
    return ASSET_ALIASES[clean];
  }

  // Fallback to standard USDT pair
  return `${clean}USDT`;
}

/**
 * Normalizes candlestick timeframe granularities for Bitget API v2.
 * Bitget mix/market/candles strictly requires: [1m, 3m, 5m, 15m, 30m, 1H, 4H, 6H, 12H, 1D, 1W, 1M]
 */
export function normalizeGranularity(raw: string): string {
  const clean = raw.trim().toLowerCase();
  switch (clean) {
    case '1m':
    case '1min':
      return '1m';
    case '3m':
    case '3min':
      return '3m';
    case '5m':
    case '5min':
      return '5m';
    case '15m':
    case '15min':
      return '15m';
    case '30m':
    case '30min':
      return '30m';
    case '1h':
    case '1hour':
      return '1H';
    case '4h':
    case '4hour':
      return '4H';
    case '6h':
    case '6hour':
      return '6H';
    case '12h':
    case '12hour':
      return '12H';
    case '1d':
    case '1day':
    case 'day':
      return '1D';
    case '1w':
    case '1week':
    case 'week':
      return '1W';
    case '1mth':
    case '1month':
    case 'month':
      return '1M';
    default:
      return '4H';
  }
}
