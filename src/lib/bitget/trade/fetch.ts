import { BITGET_REST_BASE } from '../rest';
import { getAuthHeaders, syncBitgetServerTime, type BitgetCredentials } from '../auth/signer';
import { classifyBitgetError } from '../auth/errors';
import type { BitgetErrorDetails } from '../types';

/** Minimal Bitget v3 response envelope */
export interface ApiEnvelope {
  code?: string;
  msg?: string;
  data?: unknown;
  requestTime?: number;
}

export interface ApiFetchResult {
  ok: boolean;
  httpStatus: number;
  json?: ApiEnvelope;
  raw?: string;
  error?: BitgetErrorDetails;
}

export const MISSING_CREDENTIALS_ERROR: BitgetErrorDetails = {
  category: 'MISSING_CREDENTIALS',
  message: 'Bitget credentials not configured.',
  actionableGuidance: 'Configure BITGET_API_KEY, BITGET_API_SECRET, and BITGET_PASSPHRASE via the API Keys settings modal or in .env.local.',
  canRetry: false,
};

function isTimestampError(code?: string, msg?: string): boolean {
  if (code === '40008' || code === '40017') return true;
  const lower = (msg || '').toLowerCase();
  return lower.includes('timestamp') || lower.includes('expired');
}

/**
 * Authenticated GET/POST against Bitget REST with:
 *  - Automated server clock drift synchronization
 *  - Auto-retry with fresh sync on 40008/40017 timestamp errors
 *  - 8s timeout (never hangs a tool call)
 *  - HTTP status + business-code validation
 *  - non-JSON body guard
 *  - structured BitgetErrorDetails on every failure (never throws)
 */
export async function safeGetJson(
  method: string,
  requestPath: string,
  queryString = '',
  bodyObj?: Record<string, unknown>,
  isRetry = false,
  credentials?: BitgetCredentials
): Promise<ApiFetchResult> {
  // Ensure server time is synchronized
  await syncBitgetServerTime(isRetry);

  let headers: Record<string, string>;
  try {
    headers = getAuthHeaders(method, requestPath, queryString, bodyObj, credentials);
  } catch {
    return { ok: false, httpStatus: 0, error: MISSING_CREDENTIALS_ERROR };
  }

  const url = `${BITGET_REST_BASE}${requestPath}${queryString ? `?${queryString}` : ''}`;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: bodyObj ? JSON.stringify(bodyObj) : undefined,
      signal: AbortSignal.timeout(8000),
    });

    let text = '';
    try {
      text = await res.text();
    } catch {
      text = '';
    }

    let envelope: ApiEnvelope = {};
    try {
      envelope = JSON.parse(text) as ApiEnvelope;
    } catch {
      // non-JSON body (proxy/LB HTML error page, etc.)
    }

    // If timestamp expired and we haven't retried yet, force resync and retry
    if (!isRetry && isTimestampError(envelope.code, envelope.msg)) {
      await syncBitgetServerTime(true);
      return safeGetJson(method, requestPath, queryString, bodyObj, true, credentials);
    }

    const bizOk = envelope.code === '00000' || envelope.code === '0';
    if (!res.ok || !bizOk) {
      return {
        ok: false,
        httpStatus: res.status,
        json: envelope,
        raw: text.slice(0, 500),
        error: classifyBitgetError(envelope.code ?? String(res.status), envelope.msg),
      };
    }

    return { ok: true, httpStatus: res.status, json: envelope };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      httpStatus: 0,
      error: {
        category: 'NETWORK_ERROR',
        message,
        actionableGuidance: 'Network request to Bitget failed. Check connectivity and retry the request.',
        canRetry: true,
      },
    };
  }
}