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

  const timestamp = Date.now().toString();
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
