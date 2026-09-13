import { BITGET_REST_BASE } from '../rest';
import { getAuthHeaders } from '../auth/signer';
import { classifyBitgetError } from '../auth/errors';
import { toV3Category, type BitgetV3Position } from '../types';

interface RawV3PositionData {
  symbol?: string;
  posSide?: 'long' | 'short' | 'net';
  holdSide?: 'long' | 'short' | 'net';
  total?: string;
  available?: string;
  frozen?: string;
  avgPrice?: string;
  openPriceAvg?: string;
  markPrice?: string;
  liquidationPrice?: string;
  leverage?: string | number;
  unrealisedPnl?: string;
  unrealizedPL?: string;
  profitRate?: string;
  mmr?: string;
  marginRate?: string;
  breakEvenPrice?: string;
  marginMode?: 'crossed' | 'isolated';
  holdMode?: 'single_hold' | 'double_hold';
  positionStatus?: 'normal' | 'liquidation';
  cTime?: string;
  uTime?: string;
  marginCoin?: string;
  margin?: string;
  locked?: string;
}

/**
 * Fetch current open positions on Bitget with Unified (v3) and Classic (v2) support
 */
export async function getPositionsV3(
  categoryInput = 'USDT-FUTURES'
): Promise<BitgetV3Position[]> {
  const category = toV3Category(categoryInput);
  const path = '/api/v3/position/current-position';
  const queryString = `category=${category}`;

  try {
    const headers = getAuthHeaders('GET', path, queryString);
    const response = await fetch(`${BITGET_REST_BASE}${path}?${queryString}`, {
      method: 'GET',
      headers,
    });

    const json = (await response.json()) as {
      code: string;
      msg: string;
      data?: { list?: RawV3PositionData[] } | RawV3PositionData[];
    };

    if (json.code === '00000' || json.code === '0') {
      const rawList: RawV3PositionData[] = Array.isArray(json.data)
        ? json.data
        : json.data?.list || [];

      return rawList.map((p) => {
        const avgPrice = p.avgPrice || p.openPriceAvg || '0';
        const unrealisedPnl = p.unrealisedPnl || p.unrealizedPL || '0';
        const posSide = (p.posSide || p.holdSide || 'net') as 'long' | 'short' | 'net';
        const mmr = p.mmr || p.marginRate || '0.005';
        const leverage = p.leverage !== undefined ? String(p.leverage) : '1';

        return {
          symbol: p.symbol || '',
          posSide,
          total: p.total || '0',
          available: p.available || '0',
          frozen: p.frozen || p.locked || '0',
          avgPrice,
          markPrice: p.markPrice || '0',
          liquidationPrice: p.liquidationPrice || '0',
          leverage,
          unrealisedPnl,
          profitRate: p.profitRate,
          mmr,
          breakEvenPrice: p.breakEvenPrice,
          marginMode: (p.marginMode as 'crossed' | 'isolated') || 'crossed',
          holdMode: p.holdMode || 'single_hold',
          positionStatus: p.positionStatus || 'normal',
          cTime: p.cTime || p.uTime || '',
          uTime: p.uTime,
          // Compatibility fields
          openPriceAvg: avgPrice,
          unrealizedPL: unrealisedPnl,
          holdSide: posSide,
          marginCoin: p.marginCoin || 'USDT',
          margin: p.margin || '0',
          marginRate: mmr,
          locked: p.frozen || p.locked || '0',
        };
      });
    }

    // Classic Account Fallback (Code 40084 or 40404)
    if (json.code === '40084' || json.code === '40404') {
      const v2Path = '/api/v2/mix/position/all-position';
      const v2Query = `productType=${category}`;
      const v2Headers = getAuthHeaders('GET', v2Path, v2Query);
      const v2Res = await fetch(`${BITGET_REST_BASE}${v2Path}?${v2Query}`, {
        method: 'GET',
        headers: v2Headers,
      });
      const v2Json = (await v2Res.json()) as {
        code: string;
        msg: string;
        data?: RawV3PositionData[];
      };

      if (v2Json.code === '00000' || v2Json.code === '0') {
        return (v2Json.data || []).map((p) => {
          const avgPrice = p.avgPrice || p.openPriceAvg || '0';
          const unrealisedPnl = p.unrealisedPnl || p.unrealizedPL || '0';
          const posSide = (p.posSide || p.holdSide || 'net') as 'long' | 'short' | 'net';
          const mmr = p.marginRate || '0.005';
          const leverage = p.leverage !== undefined ? String(p.leverage) : '1';

          return {
            symbol: p.symbol || '',
            posSide,
            total: p.total || '0',
            available: p.available || '0',
            frozen: p.locked || '0',
            avgPrice,
            markPrice: p.markPrice || '0',
            liquidationPrice: p.liquidationPrice || '0',
            leverage,
            unrealisedPnl,
            mmr,
            marginMode: (p.marginMode as 'crossed' | 'isolated') || 'crossed',
            cTime: p.cTime || p.uTime || '',
            // Compatibility fields
            openPriceAvg: avgPrice,
            unrealizedPL: unrealisedPnl,
            holdSide: posSide,
            marginCoin: p.marginCoin || 'USDT',
            margin: p.margin || '0',
            marginRate: mmr,
            locked: p.locked || '0',
          };
        });
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
