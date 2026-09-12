import { isRTokenSymbol } from './formatters';

export interface BitgetWsArg {
  instType: 'spot' | 'usdt-futures' | 'SPOT' | 'USDT-FUTURES';
  topic?: 'ticker' | 'books' | 'books15' | 'candle1m';
  channel?: 'ticker' | 'books' | 'books15' | 'candle1m';
  symbol?: string;
  instId?: string;
}

/**
 * Builds clean, targeted WebSocket subscription payloads for Bitget V3 UTA public topics.
 * Prevents phantom symbol cross-multiplexing and routes spot & perpetual streams.
 */
export function buildWsSubscriptions(
  cleanSymbol: string,
  targetSpotInstId: string,
  targetFuturesInstId: string
): BitgetWsArg[] {
  const isEquity = isRTokenSymbol(cleanSymbol) || cleanSymbol.startsWith('R');
  const spotIds = Array.from(new Set(isEquity ? [cleanSymbol, targetSpotInstId] : [cleanSymbol]));
  const futIds = Array.from(new Set(isEquity ? [cleanSymbol, targetFuturesInstId] : [cleanSymbol]));

  const spotArgs: BitgetWsArg[] = spotIds.flatMap((symbol) => [
    { instType: 'spot', topic: 'ticker', symbol, channel: 'ticker', instId: symbol },
    { instType: 'spot', topic: 'books', symbol, channel: 'books', instId: symbol },
    { instType: 'spot', topic: 'candle1m', symbol, channel: 'candle1m', instId: symbol },
  ]);

  const futArgs: BitgetWsArg[] = futIds.flatMap((symbol) => [
    { instType: 'usdt-futures', topic: 'ticker', symbol, channel: 'ticker', instId: symbol },
    { instType: 'usdt-futures', topic: 'books', symbol, channel: 'books', instId: symbol },
    { instType: 'usdt-futures', topic: 'candle1m', symbol, channel: 'candle1m', instId: symbol },
  ]);

  return [...spotArgs, ...futArgs];
}

