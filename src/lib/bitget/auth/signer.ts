import crypto from 'node:crypto';

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

const SYNC_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Synchronizes local system clock with Bitget's live server time.
 * Calculates network latency to maintain sub-second synchronization.
 */
export async function syncBitgetServerTime(force = false): Promise<number> {
  const now = Date.now();
  if (!force && lastSyncTimestampMs > 0 && now - lastSyncTimestampMs < SYNC_EXPIRY_MS) {
    return serverTimeOffsetMs;
  }

  if (syncPromise && !force) {
    return syncPromise;
  }

  syncPromise = (async () => {
    try {
      const t0 = Date.now();
      const res = await fetch('https://api.bitget.com/api/v2/public/time', {
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

/**
 * Builds standard Bitget authenticated request headers.
 */
export function getAuthHeaders(
  method: string,
  requestPath: string,
  queryString = '',
  bodyObj?: Record<string, unknown>
): Record<string, string> {
  const apiKey = process.env.BITGET_API_KEY;
  const apiSecret = process.env.BITGET_API_SECRET;
  const passphrase = process.env.BITGET_PASSPHRASE;
  const isDemo = process.env.BITGET_DEMO_TRADING === 'true';

  if (!apiKey || !apiSecret || !passphrase) {
    throw new Error(
      'Bitget credentials not configured. Please set BITGET_API_KEY, BITGET_API_SECRET, and BITGET_PASSPHRASE in .env.local.'
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

