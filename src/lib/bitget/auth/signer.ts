import crypto from 'node:crypto';
import { BITGET_TIME_URL, SERVER_TIME_SYNC_EXPIRY_MS } from '../constants';

/**
 * Sorts query string keys alphabetically according to Bitget signing specifications
 */
export function sortQueryString(queryString: string): string {
  if (!queryString || !queryString.includes('&')) return queryString;
  const params = new URLSearchParams(queryString);
  params.sort();
  return params.toString();
}

/**
 * Generates an RFC-compliant Base64 HMAC-SHA256 signature for Bitget private endpoints.
 * preHash = timestamp + method + requestPath + (queryString ? '?' + queryString : '') + bodyString
 */
export function generateBitgetV3Signature(
  secretKey: string,
  timestamp: string,
  method: string,
  requestPath: string,
  queryString = '',
  bodyString = ''
): string {
  const fullPath = queryString ? `${requestPath}?${queryString}` : requestPath;
  const preHash = `${timestamp}${method.toUpperCase()}${fullPath}${bodyString}`;
  return crypto.createHmac('sha256', secretKey).update(preHash).digest('base64');
}

let serverTimeOffsetMs = 0;
let lastSyncTimestampMs = 0;
let syncPromise: Promise<number> | null = null;

/**
 * Synchronizes local system clock with Bitget's live server time.
 * Calculates network latency to maintain sub-second synchronization.
 */
export async function syncBitgetServerTime(force = false): Promise<number> {
  const now = Date.now();
  if (!force && lastSyncTimestampMs > 0 && now - lastSyncTimestampMs < SERVER_TIME_SYNC_EXPIRY_MS) {
    return serverTimeOffsetMs;
  }

  if (syncPromise && !force) {
    return syncPromise;
  }

  syncPromise = (async () => {
    try {
      const t0 = Date.now();
      const res = await fetch(BITGET_TIME_URL, {
        signal: AbortSignal.timeout(4000),
      });
      const t1 = Date.now();
      if (res.ok) {
        const json = (await res.json()) as { code: string; data?: { serverTime?: string } };
        const serverTimeStr = json.data?.serverTime;
        if (serverTimeStr) {
          const serverTime = parseInt(serverTimeStr, 10);
          const roundTrip = t1 - t0;
          const estimatedLocalAtServer = t0 + Math.floor(roundTrip / 2);
          serverTimeOffsetMs = serverTime - estimatedLocalAtServer;
          lastSyncTimestampMs = Date.now();
        }
      }
    } catch {
      // Keep existing offset if network temporarily fails
    } finally {
      syncPromise = null;
    }
    return serverTimeOffsetMs;
  })();

  return syncPromise;
}

/**
 * Returns current timestamp synchronized with Bitget server time.
 */
export function getSyncedBitgetTimestamp(): string {
  return (Date.now() + serverTimeOffsetMs).toString();
}

export interface BitgetCredentials {
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string;
  isDemo?: boolean;
}

/** Fully-specified credentials as persisted/configured by the UI. */
export type BitgetApiCredentials = Required<BitgetCredentials>;

/**
 * Resolves the demo/paper-trading flag from UI credentials when provided,
 * falling back to the BITGET_DEMO_TRADING environment variable.
 */
export function resolveDemoMode(credentials?: BitgetCredentials): boolean {
  return credentials?.isDemo !== undefined
    ? credentials.isDemo
    : process.env.BITGET_DEMO_TRADING === 'true';
}

/**
 * Builds standard Bitget authenticated request headers.
 */
export function getAuthHeaders(
  method: string,
  requestPath: string,
  queryString = '',
  bodyObj?: Record<string, unknown>,
  credentials?: BitgetCredentials
): Record<string, string> {
  const apiKey = credentials?.apiKey || process.env.BITGET_API_KEY;
  const apiSecret = credentials?.apiSecret || process.env.BITGET_API_SECRET;
  const passphrase = credentials?.passphrase || process.env.BITGET_PASSPHRASE;
  const isDemo = resolveDemoMode(credentials);

  if (!apiKey || !apiSecret || !passphrase) {
    throw new Error(
      'Bitget credentials not configured. Please set BITGET_API_KEY, BITGET_API_SECRET, and BITGET_PASSPHRASE in .env.local or configure them in Settings.'
    );
  }

  const timestamp = getSyncedBitgetTimestamp();
  const bodyString = bodyObj ? JSON.stringify(bodyObj) : '';
  const signature = generateBitgetV3Signature(
    apiSecret,
    timestamp,
    method,
    requestPath,
    queryString,
    bodyString
  );

  const headers: Record<string, string> = {
    'ACCESS-KEY': apiKey,
    'ACCESS-SIGN': signature,
    'ACCESS-TIMESTAMP': timestamp,
    'ACCESS-PASSPHRASE': passphrase,
    'Content-Type': 'application/json',
    locale: 'en-US',
  };

  if (isDemo) {
    headers.paptrading = '1';
  }

  return headers;
}

