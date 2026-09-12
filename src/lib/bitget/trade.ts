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
  BitgetErrorDetails,
} from './types';

/**
 * Generates an RFC-compliant Base64 HMAC-SHA256 signature for Bitget private endpoints.
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
 * Classifies Bitget raw error codes and error messages into structured recovery guidance.
 */
export function classifyBitgetError(code: string, rawMsg = ''): BitgetErrorDetails {
  const cleanCode = code.toString().trim();
  const lowerMsg = rawMsg.toLowerCase();

  // Authentication & API Key Errors
  if (
    cleanCode === '40006' ||
    cleanCode === '40014' ||
    cleanCode === '40015' ||
    cleanCode === '40012' ||
    lowerMsg.includes('invalid access_key') ||
    lowerMsg.includes('signature') ||
    lowerMsg.includes('passphrase') ||
    lowerMsg.includes('api key')
  ) {
    return {
      category: 'AUTH_FAILED',
      code: cleanCode,
      message: rawMsg || 'Bitget API authentication failed.',
      actionableGuidance:
        'Verify BITGET_API_KEY, BITGET_API_SECRET, and BITGET_PASSPHRASE in .env.local. Ensure permissions include Read/Trade.',
      canRetry: false,
    };
  }

  // Timestamp drift / clock sync
  if (cleanCode === '40017' || lowerMsg.includes('timestamp')) {
    return {
      category: 'AUTH_FAILED',
      code: cleanCode,
      message: rawMsg || 'Request timestamp expired or out of sync.',
      actionableGuidance:
        'System clock is out of sync with Bitget server time. Synchronize your system clock with NTP.',
      canRetry: true,
    };
  }

  // IP Whitelist restrictions
  if (cleanCode === '40034' || cleanCode === '40035' || lowerMsg.includes('ip') || lowerMsg.includes('whitelist')) {
    return {
      category: 'IP_BLOCKED',
      code: cleanCode,
      message: rawMsg || 'IP address is not whitelisted on Bitget API key.',
      actionableGuidance:
        'Add your current server/public IP to the Bitget API Key IP Whitelist in your Bitget API management console.',
      canRetry: false,
    };
  }

  // Insufficient Balance / Margin
  if (
    cleanCode === '43012' ||
    cleanCode === '43013' ||
    cleanCode === '40754' ||
    lowerMsg.includes('balance') ||
    lowerMsg.includes('insufficient')
  ) {
    return {
      category: 'INSUFFICIENT_FUNDS',
      code: cleanCode,
      message: rawMsg || 'Insufficient account balance or available margin.',
      actionableGuidance:
        'Deposit or transfer additional USDT collateral into your Bitget trading account or reduce order size.',
      canRetry: false,
    };
  }

  // Order Parameter or Size Limits
  if (
    cleanCode === '43025' ||
    cleanCode === '43026' ||
    cleanCode === '43004' ||
    cleanCode === '43009' ||
    lowerMsg.includes('size') ||
    lowerMsg.includes('quantity') ||
    lowerMsg.includes('leverage')
  ) {
    return {
      category: 'ORDER_INVALID',
      code: cleanCode,
      message: rawMsg || 'Order size or leverage exceeds Bitget market constraints.',
      actionableGuidance:
        'Adjust the trade size to meet minimum contract step requirements or lower the leverage multiple.',
      canRetry: false,
    };
  }

  // Rate Limiting
  if (cleanCode === '40800' || cleanCode === '429' || lowerMsg.includes('rate limit') || lowerMsg.includes('too many')) {
    return {
      category: 'RATE_LIMITED',
      code: cleanCode,
      message: rawMsg || 'Bitget API rate limit exceeded.',
      actionableGuidance: 'Wait a few seconds before retrying the request.',
      canRetry: true,
    };
  }

  // Default Exchange Error
  return {
    category: 'EXCHANGE_ERROR',
    code: cleanCode,
    message: rawMsg || `Bitget API returned error code ${cleanCode}.`,
    actionableGuidance: 'Check the parameters and try again or consult Bitget API documentation.',
    canRetry: false,
  };
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
 * Submit an order using Bitget UTA (v3) with Classic (v2) fallback
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

  try {
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

    if (json.code === '00000' || json.code === '0') {
      return {
        orderId: json.data?.orderId || '',
        clientOid: json.data?.clientOid || (payload.clientOid as string),
        symbol: sym,
        category: payload.category as string,
        status: 'submitted',
      };
    }

    // If account is Classic Mode (40084/40404), route to V2 Mix / Spot place-order
    if (json.code === '40084' || json.code === '40404') {
      const isFutures = (payload.category as string) !== 'spot';
      const v2Path = isFutures ? '/api/v2/mix/order/place-order' : '/api/v2/spot/trade/place-order';
      const v2Payload: Record<string, unknown> = isFutures
        ? {
            symbol: sym,
            productType: 'USDT-FUTURES',
            marginCoin: 'USDT',
            marginMode: params.marginMode || 'crossed',
            side: params.side,
            tradeSide: params.tradeSide || 'open',
            orderType: params.orderType,
            size: params.size,
            price: params.price,
            clientOid: payload.clientOid,
            presetStopLossPrice: params.presetStopLossPrice,
            presetTakeProfitPrice: params.presetTakeProfitPrice,
          }
        : {
            symbol: sym,
            side: params.side,
            orderType: params.orderType,
            size: params.size,
            price: params.price,
            clientOid: payload.clientOid,
          };

      const v2Headers = getAuthHeaders('POST', v2Path, '', v2Payload);
      const v2Res = await fetch(`${BITGET_REST_BASE}${v2Path}`, {
        method: 'POST',
        headers: v2Headers,
        body: JSON.stringify(v2Payload),
      });
      const v2Json = (await v2Res.json()) as {
        code: string;
        msg: string;
        data?: { orderId?: string; clientOid?: string };
      };

      if (v2Json.code === '00000' || v2Json.code === '0') {
        return {
          orderId: v2Json.data?.orderId || '',
          clientOid: v2Json.data?.clientOid || (payload.clientOid as string),
          symbol: sym,
          category: payload.category as string,
          status: 'submitted',
        };
      }

      const v2Err = classifyBitgetError(v2Json.code, v2Json.msg);
      throw new Error(`Bitget Place Order failed [${v2Json.code}]: ${v2Err.message}. ${v2Err.actionableGuidance}`);
    }

    const err = classifyBitgetError(json.code, json.msg);
    throw new Error(`Bitget Place Order failed [${json.code}]: ${err.message}. ${err.actionableGuidance}`);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Bitget Place Order failed: Unknown error');
  }
}

/**
 * Modify an active in-flight order on Bitget
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
    const err = classifyBitgetError(json.code, json.msg);
    throw new Error(`Bitget Modify Order failed [${json.code}]: ${err.message}. ${err.actionableGuidance}`);
  }

  return {
    success: true,
    orderId: json.data?.orderId || params.orderId,
  };
}

/**
 * Cancel an open order on Bitget
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
    const err = classifyBitgetError(json.code, json.msg);
    throw new Error(`Bitget Cancel Order failed [${json.code}]: ${err.message}. ${err.actionableGuidance}`);
  }

  return {
    success: true,
    orderId: json.data?.orderId || params.orderId,
  };
}

interface RawClassicPosition {
  symbol?: string;
  marginCoin?: string;
  holdSide?: string;
  total?: string;
  available?: string;
  locked?: string;
  margin?: string;
  marginSize?: string;
  leverage?: string | number;
  openPriceAvg?: string;
  averageOpenPrice?: string;
  markPrice?: string;
  liquidationPrice?: string;
  unrealizedPL?: string;
  marginRate?: string;
  marginMode?: string;
  cTime?: string;
  uTime?: string;
}

/**
 * Fetch current open positions on Bitget with Unified (v3) and Classic (v2) support
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

    // Classic Account Fallback (Code 40084 or 40404)
    if (json.code === '40084' || json.code === '40404') {
      const v2Path = '/api/v2/mix/position/all-position';
      const v2Query = `productType=${productType}`;
      const v2Headers = getAuthHeaders('GET', v2Path, v2Query);
      const v2Res = await fetch(`${BITGET_REST_BASE}${v2Path}?${v2Query}`, {
        method: 'GET',
        headers: v2Headers,
      });
      const v2Json = (await v2Res.json()) as {
        code: string;
        msg: string;
        data?: RawClassicPosition[];
      };

      if (v2Json.code === '00000' || v2Json.code === '0') {
        return (v2Json.data || []).map((p) => ({
          symbol: p.symbol || '',
          marginCoin: p.marginCoin || 'USDT',
          holdSide: (p.holdSide as 'long' | 'short' | 'net') || 'net',
          total: p.total || '0',
          available: p.available || '0',
          locked: p.locked || '0',
          margin: p.marginSize || p.margin || '0',
          leverage: typeof p.leverage === 'number' ? p.leverage : parseInt(p.leverage || '1', 10),
          openPriceAvg: p.openPriceAvg || p.averageOpenPrice || '0',
          markPrice: p.markPrice || '0',
          liquidationPrice: p.liquidationPrice || '0',
          unrealizedPL: p.unrealizedPL || '0',
          marginRate: p.marginRate || '0',
          marginMode: (p.marginMode as 'crossed' | 'isolated') || 'crossed',
          cTime: p.cTime || p.uTime || '',
        }));
      }

      const v2Err = classifyBitgetError(v2Json.code, v2Json.msg);
      throw new Error(`Bitget Positions failed [${v2Json.code}]: ${v2Err.message}. ${v2Err.actionableGuidance}`);
    }

    const err = classifyBitgetError(json.code, json.msg);
    throw new Error(`Bitget Positions failed [${json.code}]: ${err.message}. ${err.actionableGuidance}`);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Bitget Positions query failed: Unknown error');
  }
}

/**
 * Fetch Trading Account Overview (Equity, Margin, Positions) across Unified & Classic Modes
 */
export async function getAccountOverviewV3(): Promise<BitgetAccountOverview> {
  const settingsPath = '/api/v3/account/settings';
  const assetsPath = '/api/v3/account/assets';

  try {
    const [settingsHeaders, assetsHeaders] = [
      getAuthHeaders('GET', settingsPath),
      getAuthHeaders('GET', assetsPath, 'category=USDT-FUTURES'),
    ];

    const [settingsRes, assetsRes, positions] = await Promise.all([
      fetch(`${BITGET_REST_BASE}${settingsPath}`, { method: 'GET', headers: settingsHeaders }),
      fetch(`${BITGET_REST_BASE}${assetsPath}?category=USDT-FUTURES`, { method: 'GET', headers: assetsHeaders }),
      getPositionsV3('USDT-FUTURES'),
    ]);

    const settingsJson = (await settingsRes.json()) as {
      code: string;
      msg?: string;
      data?: { accountMode?: string };
    };

    // If Unified Account (UTA) is supported:
    if (settingsJson.code === '00000' || settingsJson.code === '0') {
      let totalEquity = 0;
      let availableEquity = 0;
      let unrealizedPnl = 0;

      if (assetsRes.ok) {
        try {
          const assetsJson = (await assetsRes.json()) as {
            code: string;
            data?: Array<{
              coin?: string;
              equity?: string;
              available?: string;
              unrealizedPL?: string;
              usdtEquity?: string;
            }>;
          };
          if ((assetsJson.code === '00000' || assetsJson.code === '0') && assetsJson.data) {
            for (const asset of assetsJson.data) {
              totalEquity += parseFloat(asset.equity || asset.usdtEquity || '0');
              availableEquity += parseFloat(asset.available || '0');
            }
          }
        } catch {
          // Fall through to positions rollup
        }
      }

      for (const pos of positions) {
        unrealizedPnl += parseFloat(pos.unrealizedPL || '0');
      }

      return {
        totalEquityUsdt: parseFloat(totalEquity.toFixed(2)),
        availableEquityUsdt: parseFloat(availableEquity.toFixed(2)),
        unrealizedPnlUsdt: parseFloat(unrealizedPnl.toFixed(2)),
        marginRatioPercent: 0,
        accountMode: (settingsJson.data?.accountMode as 'basic' | 'advanced' | 'isolated') || 'advanced',
        positions,
      };
    }

    // Classic Account Mode (40084 or 40404)
    if (settingsJson.code === '40084' || settingsJson.code === '40404') {
      const [mixRes, spotRes] = await Promise.all([
        fetch(`${BITGET_REST_BASE}/api/v2/mix/account/accounts?productType=USDT-FUTURES`, {
          method: 'GET',
          headers: getAuthHeaders('GET', '/api/v2/mix/account/accounts', 'productType=USDT-FUTURES'),
        }),
        fetch(`${BITGET_REST_BASE}/api/v2/spot/account/assets`, {
          method: 'GET',
          headers: getAuthHeaders('GET', '/api/v2/spot/account/assets'),
        }),
      ]);

      let totalEquity = 0;
      let availableEquity = 0;
      let unrealizedPnl = 0;

      if (mixRes.ok) {
        try {
          const mixJson = (await mixRes.json()) as {
            code: string;
            data?: Array<{
              usdtEquity?: string;
              available?: string;
              unrealizedPL?: string;
            }>;
          };
          if (mixJson.data && mixJson.data.length > 0) {
            for (const acc of mixJson.data) {
              totalEquity += parseFloat(acc.usdtEquity || '0');
              availableEquity += parseFloat(acc.available || '0');
              unrealizedPnl += parseFloat(acc.unrealizedPL || '0');
            }
          }
        } catch {
          // Fall through
        }
      }

      if (spotRes.ok) {
        try {
          const spotJson = (await spotRes.json()) as {
            code: string;
            data?: Array<{
              coin?: string;
              available?: string;
              locked?: string;
            }>;
          };
          if (spotJson.data && spotJson.data.length > 0) {
            for (const asset of spotJson.data) {
              if (asset.coin === 'USDT' || asset.coin === 'USDC') {
                const amount = parseFloat(asset.available || '0') + parseFloat(asset.locked || '0');
                totalEquity += amount;
                availableEquity += parseFloat(asset.available || '0');
              }
            }
          }
        } catch {
          // Fall through
        }
      }

      for (const pos of positions) {
        unrealizedPnl += parseFloat(pos.unrealizedPL || '0');
      }

      return {
        totalEquityUsdt: parseFloat(totalEquity.toFixed(2)),
        availableEquityUsdt: parseFloat(availableEquity.toFixed(2)),
        unrealizedPnlUsdt: parseFloat(unrealizedPnl.toFixed(2)),
        marginRatioPercent: 0,
        accountMode: 'basic',
        positions,
      };
    }

    const err = classifyBitgetError(settingsJson.code, settingsJson.msg);
    throw new Error(`Bitget Account Settings failed [${settingsJson.code}]: ${err.message}. ${err.actionableGuidance}`);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Failed to retrieve Bitget Account Overview: Unknown error');
  }
}
