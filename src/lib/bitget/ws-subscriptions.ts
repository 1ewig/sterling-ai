export interface BitgetWsArg {
  instType: 'SPOT' | 'USDT-FUTURES';
  channel: 'ticker' | 'books' | 'books15' | 'candle1m';
  instId: string;
}

/**
 * Builds clean, targeted WebSocket subscription payloads for Bitget v2 public channels.
 * Prevents phantom symbol cross-multiplexing and ensures rTokens subscribe to 'books'
 * while standard spot and perpetuals subscribe to 'books15'.
 */
export function buildWsSubscriptions(
  cleanSymbol: string,
  targetSpotInstId: string,
  targetFuturesInstId: string
): BitgetWsArg[] {
  const spotIds = Array.from(new Set([cleanSymbol, targetSpotInstId]));
  const futIds = Array.from(new Set([cleanSymbol, targetFuturesInstId]));

  const spotArgs: BitgetWsArg[] = spotIds.flatMap((instId) => {
    const isRToken = instId.startsWith('R');
    return [
      { instType: 'SPOT', channel: 'ticker', instId },
      isRToken
        ? { instType: 'SPOT', channel: 'books', instId }
        : { instType: 'SPOT', channel: 'books15', instId },
      { instType: 'SPOT', channel: 'candle1m', instId },
    ];
  });

  const futArgs: BitgetWsArg[] = futIds.flatMap((instId) => [
    { instType: 'USDT-FUTURES', channel: 'ticker', instId },
    { instType: 'USDT-FUTURES', channel: 'books15', instId },
    { instType: 'USDT-FUTURES', channel: 'candle1m', instId },
  ]);

  return [...spotArgs, ...futArgs];
}
