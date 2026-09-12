import { BITGET_REST_BASE } from '../rest';
import { getAuthHeaders } from '../auth/signer';
import { classifyBitgetError } from '../auth/errors';
import type { BitgetV3Position } from '../types';

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
