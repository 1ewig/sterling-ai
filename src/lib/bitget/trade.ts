import crypto from 'node:crypto';
import { BITGET_REST_BASE } from './rest';
import { normalizeSymbol } from './symbols';
import type {
  BitgetV3OrderParams,
  BitgetV3OrderResponse,
  BitgetV3ModifyParams,
  BitgetV3CancelParams,
  BitgetV3Position,
  BitgetAccountOverview,
} from './types';

/**
 * Generates an RFC-compliant Base64 HMAC-SHA256 signature for Bitget v3 private endpoints.
 * preHash = timestamp + method + requestPath + queryString + bodyString
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
function getAuthHeaders(
  method: string,
  requestPath: string,
  queryString = '',
  bodyObj?: Record<string, unknown>
): Record<string, string> {
  const apiKey = process.env.BITGET_API_KEY;
  const apiSecret = process.env.BITGET_API_SECRET;
  const passphrase = process.env.BITGET_PASSPHRASE;

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

  return {
    'ACCESS-KEY': apiKey,
    'ACCESS-SIGN': signature,
    'ACCESS-TIMESTAMP': timestamp,
    'ACCESS-PASSPHRASE': passphrase,
    'Content-Type': 'application/json',
    locale: 'en-US',
  };
}

/**
 * Submit an order using Bitget Unified Trading Account (v3)
 * Endpoint: POST /api/v3/trade/place-order
 */
export async function placeOrderV3(
  params: BitgetV3OrderParams
): Promise<BitgetV3OrderResponse> {
  const path = '/api/v3/trade/place-order';
  const sym = normalizeSymbol(params.symbol);

  const payload: Record<string, unknown> = {
    symbol: sym,
    category: params.category || 'usdt-futures',
    side: params.side,
    orderType: params.orderType,
    size: params.size,
    price: params.price,
    tradeSide: params.tradeSide || 'open',
    marginMode: params.marginMode || 'crossed',
    marginCoin: params.marginCoin || 'USDT',
    timeInForce: params.timeInForce || 'gtc',
    clientOid: params.clientOid || `argus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };

  if (params.presetStopLossPrice) {
    payload.presetStopLossPrice = params.presetStopLossPrice;
    payload.slOrderType = 'market';
  }

  if (params.presetTakeProfitPrice) {
    payload.presetTakeProfitPrice = params.presetTakeProfitPrice;
    payload.tpOrderType = 'market';
  }

  const headers = getAuthHeaders('POST', path, '', payload);
  const response = await fetch(`${BITGET_REST_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as {
    code: string;
    msg: string;
    data?: { orderId: string; clientOid?: string };
  };

  if (json.code !== '00000' && json.code !== '0') {
    throw new Error(`Bitget v3 Place Order failed [${json.code}]: ${json.msg}`);
  }

  return {
    orderId: json.data?.orderId || '',
    clientOid: json.data?.clientOid || (payload.clientOid as string),
    symbol: sym,
    category: payload.category as string,
    status: 'submitted',
  };
}

/**
 * Modify an active in-flight order on Bitget v3
 * Endpoint: POST /api/v3/trade/modify-order
 */
export async function modifyOrderV3(
  params: BitgetV3ModifyParams
): Promise<{ success: boolean; orderId?: string }> {
  const path = '/api/v3/trade/modify-order';
  const sym = normalizeSymbol(params.symbol);

  const payload: Record<string, unknown> = {
    symbol: sym,
    category: params.category || 'usdt-futures',
    orderId: params.orderId,
    clientOid: params.clientOid,
    newPrice: params.newPrice,
    newSize: params.newSize,
  };

  const headers = getAuthHeaders('POST', path, '', payload);
  const response = await fetch(`${BITGET_REST_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as { code: string; msg: string; data?: { orderId?: string } };

  if (json.code !== '00000' && json.code !== '0') {
    throw new Error(`Bitget v3 Modify Order failed [${json.code}]: ${json.msg}`);
  }

  return {
    success: true,
    orderId: json.data?.orderId || params.orderId,
  };
}

/**
 * Cancel an open order on Bitget v3
 * Endpoint: POST /api/v3/trade/cancel-order
 */
export async function cancelOrderV3(
  params: BitgetV3CancelParams
): Promise<{ success: boolean; orderId?: string }> {
  const path = '/api/v3/trade/cancel-order';
  const sym = normalizeSymbol(params.symbol);

  const payload: Record<string, unknown> = {
    symbol: sym,
    category: params.category || 'usdt-futures',
    orderId: params.orderId,
    clientOid: params.clientOid,
  };

  const headers = getAuthHeaders('POST', path, '', payload);
  const response = await fetch(`${BITGET_REST_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as { code: string; msg: string; data?: { orderId?: string } };

  if (json.code !== '00000' && json.code !== '0') {
    throw new Error(`Bitget v3 Cancel Order failed [${json.code}]: ${json.msg}`);
  }

  return {
    success: true,
    orderId: json.data?.orderId || params.orderId,
  };
}

/**
 * Fetch current open positions on Bitget v3
 * Endpoint: GET /api/v3/trade/current-positions
 */
export async function getPositionsV3(
  productType = 'USDT-FUTURES'
): Promise<BitgetV3Position[]> {
  const path = '/api/v3/trade/current-positions';
  const queryString = `productType=${productType}`;

  try {
    const headers = getAuthHeaders('GET', path, queryString);
    const response = await fetch(`${BITGET_REST_BASE}${path}?${queryString}`, {
      method: 'GET',
      headers,
    });

    const json = (await response.json()) as {
      code: string;
      msg: string;
      data?: BitgetV3Position[];
    };

    if (json.code === '00000' || json.code === '0') {
      return json.data || [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Fetch Unified Trading Account Overview (Equity, Margin, Positions)
 */
export async function getAccountOverviewV3(): Promise<BitgetAccountOverview> {
  const path = '/api/v3/account/settings';

  try {
    const headers = getAuthHeaders('GET', path);
    const [settingsRes, positions] = await Promise.all([
      fetch(`${BITGET_REST_BASE}${path}`, { method: 'GET', headers }),
      getPositionsV3('USDT-FUTURES'),
    ]);

    const settingsJson = (await settingsRes.json()) as {
      code: string;
      data?: { accountMode?: string };
    };

    let totalEquity = 0;
    let availableEquity = 0;
    let unrealizedPnl = 0;

    for (const pos of positions) {
      unrealizedPnl += parseFloat(pos.unrealizedPL || '0');
    }

    return {
      totalEquityUsdt: totalEquity,
      availableEquityUsdt: availableEquity,
      unrealizedPnlUsdt: unrealizedPnl,
      marginRatioPercent: 0,
      accountMode: (settingsJson.data?.accountMode as 'basic' | 'advanced' | 'isolated') || 'advanced',
      positions,
    };
  } catch (err) {
    throw new Error(
      `Failed to retrieve Bitget v3 Account Overview: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}
