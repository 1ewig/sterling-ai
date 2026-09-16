import type { BitgetCredentials } from '@/lib/bitget/auth/signer';

export type TradingMode = 'sandbox' | 'live';

export const TRADING_MODE_HEADER = 'x-trading-mode';

/**
 * Extracts client-supplied Bitget credentials from incoming request headers.
 */
export function extractBitgetCredentials(req: Request): BitgetCredentials | undefined {
  const apiKey = req.headers.get('x-bitget-api-key') || undefined;
  const apiSecret = req.headers.get('x-bitget-api-secret') || undefined;
  const passphrase = req.headers.get('x-bitget-passphrase') || undefined;
  const isDemoHeader = req.headers.get('x-bitget-demo');
  const isDemo = isDemoHeader !== null ? isDemoHeader === 'true' : undefined;

  if (apiKey && apiSecret && passphrase) {
    return { apiKey, apiSecret, passphrase, isDemo };
  }
  return undefined;
}

/**
 * Resolves the effective trading mode from an incoming request.
 * Header `x-trading-mode: sandbox|live` wins when present; otherwise it
 * falls back to client credentials or configured server-side credentials.
 */
export function resolveTradingMode(req: Request): TradingMode {
  const header = req.headers.get(TRADING_MODE_HEADER);
  if (header === 'sandbox') return 'sandbox';
  if (header === 'live') return 'live';

  const clientCreds = extractBitgetCredentials(req);
  const hasCredentials = Boolean(
    (clientCreds?.apiKey && clientCreds?.apiSecret && clientCreds?.passphrase) ||
    (process.env.BITGET_API_KEY && process.env.BITGET_API_SECRET && process.env.BITGET_PASSPHRASE)
  );

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