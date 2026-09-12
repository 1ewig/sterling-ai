/**
 * Centralized Market Data Formatters & Asset Pair Utilities.
 * Replaces ad-hoc string formatting, floating point conversions, and regex parsing across market streamer components.
 */

const KNOWN_EQUITY_BASES = new Set([
  'TSLA',
  'NVDA',
  'SPY',
  'QQQ',
  'AAPL',
  'MSFT',
  'AMZN',
  'GOOGL',
  'META',
  'COIN',
  'MSTR',
]);

/**
 * Parses a standard trading symbol into its base and quote components.
 * e.g. "BTCUSDT" -> { baseAsset: "BTC", quoteAsset: "USDT" }
 * e.g. "RTSLAUSDT" -> { baseAsset: "RTSLA", quoteAsset: "USDT" }
 */
export function parseAssetPair(symbol: string): { baseAsset: string; quoteAsset: string } {
  if (!symbol) return { baseAsset: '', quoteAsset: 'USDT' };
  const clean = symbol.trim().toUpperCase();
  const quoteAsset = clean.endsWith('USDC') ? 'USDC' : 'USDT';
  const baseAsset = clean.replace(/(USDT|USDC|USD)$/, '');
  return { baseAsset: baseAsset || clean, quoteAsset };
}

/**
 * Checks whether a given symbol is an equity synthetic/rToken.
 * e.g. "RTSLAUSDT" -> true, "TSLAUSDT" -> true, "BTCUSDT" -> false
 */
export function isRTokenSymbol(symbol: string): boolean {
  if (!symbol) return false;
  const upper = symbol.toUpperCase().trim();
  const { baseAsset } = parseAssetPair(upper);
  if (baseAsset.startsWith('R')) {
    const stripped = baseAsset.slice(1);
    if (KNOWN_EQUITY_BASES.has(stripped)) return true;
  }
  return KNOWN_EQUITY_BASES.has(baseAsset);
}

/**
 * Formats market price with adaptive precision according to institutional tick sizes.
 */
export function formatMarketPrice(price: number): string {
  if (!Number.isFinite(price) || price === 0) return '0.00';
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) {
    return price.toFixed(4);
  }
  if (price >= 0.01) {
    return price.toFixed(5);
  }
  if (price >= 0.0001) {
    return price.toFixed(6);
  }
  return price.toFixed(8);
}

/**
 * Formats volume or notional value with standard financial suffixes ($B, $M, $K).
 */
export function formatMarketVolume(vol: number, prefix: string = '$'): string {
  if (!Number.isFinite(vol) || vol <= 0) return `${prefix}0.00`;
  if (vol >= 1_000_000_000) {
    return `${prefix}${(vol / 1_000_000_000).toFixed(2)}B`;
  }
  if (vol >= 1_000_000) {
    return `${prefix}${(vol / 1_000_000).toFixed(2)}M`;
  }
  if (vol >= 1_000) {
    return `${prefix}${(vol / 1_000).toFixed(1)}K`;
  }
  return `${prefix}${vol.toFixed(0)}`;
}

/**
 * Formats orderbook depth size quantities.
 */
export function formatBookSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return '0.000';
  if (size >= 1_000_000) {
    return `${(size / 1_000_000).toFixed(2)}M`;
  }
  if (size >= 10_000) {
    return `${(size / 1_000).toFixed(1)}K`;
  }
  if (size >= 1) {
    return size.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return size.toFixed(3);
}

/**
 * Formats bid-ask spread with appropriate floating precision.
 */
export function formatSpread(spread: number): string {
  if (!Number.isFinite(spread)) return '0.00';
  if (spread >= 1) {
    return spread.toFixed(2);
  }
  if (spread >= 0.01) {
    return spread.toFixed(4);
  }
  if (spread >= 0.0001) {
    return spread.toFixed(6);
  }
  return spread.toFixed(8);
}
