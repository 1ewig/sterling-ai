export type TradingMode = 'sandbox' | 'live';

export const TRADING_MODE_HEADER = 'x-trading-mode';

/**
 * Resolves the effective trading mode from an incoming request.
 * Header `x-trading-mode: sandbox|live` wins when present; otherwise it
 * falls back to the presence of configured server-side credentials.
 */
export function resolveTradingMode(req: Request): TradingMode {
  const header = req.headers.get(TRADING_MODE_HEADER);
  if (header === 'sandbox' || header === 'live') return header;

  const hasCredentials =
    Boolean(process.env.BITGET_API_KEY) &&
    Boolean(process.env.BITGET_API_SECRET) &&
    Boolean(process.env.BITGET_PASSPHRASE);

  return hasCredentials ? 'live' : 'sandbox';
}

/**
 * Detects whether an error message describes missing Bitget credentials.
 */
export function isMissingConfigError(message?: string): boolean {
  if (!message) return false;
  return (
    message.includes('BITGET_API_KEY') ||
    message.includes('credentials not configured') ||
    message.includes('MISSING_CREDENTIALS')
  );
}

/**
 * Wraps sandbox data in the canonical success envelope shared across routes.
 */
export function sandboxResponse<T>(data: T, extra?: Record<string, unknown>) {
  return {
    success: true,
    data,
    isSandbox: true,
    ...extra,
  };
}