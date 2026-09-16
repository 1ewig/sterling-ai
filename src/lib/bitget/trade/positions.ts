import { safeGetJson } from './fetch';
import { classifyBitgetError } from '../auth/errors';
import type { BitgetCredentials } from '../auth/signer';
import { toV3Category, type BitgetErrorDetails, type BitgetV3Position } from '../types';

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

function mapRawPosition(p: RawV3PositionData): BitgetV3Position {
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
}

export type PositionsFetchResult =
  | { ok: true; positions: BitgetV3Position[] }
  | { ok: false; positions: []; error: BitgetErrorDetails };

/**
 * Non-throwing positions query used for resilient aggregation.
 * NOTE: UTA current-position rejects SPOT/MARGIN ("Parameter SPOT does not exist"), so only
 * futures categories should be requested.
 */
export async function fetchPositionsV3(
  categoryInput = 'USDT-FUTURES',
  credentials?: BitgetCredentials
): Promise<PositionsFetchResult> {
  const category = toV3Category(categoryInput);
  const path = '/api/v3/position/current-position';
  const queryString = `category=${category}`;

  const result = await safeGetJson('GET', path, queryString, undefined, false, credentials);
  if (!result.ok || !result.json) {
    return { ok: false, positions: [], error: result.error ?? classifyBitgetError('0', 'Unknown positions error') };
  }

  const data = result.json.data as { list?: RawV3PositionData[] } | RawV3PositionData[] | null | undefined;
  const rawList: RawV3PositionData[] = Array.isArray(data) ? data : data?.list || [];

  return { ok: true, positions: rawList.map(mapRawPosition) };
}

/**
 * Throwing positions query (used by order-management tools). Throws a descriptive
 * Bitget error string on failure, matching the pre-refactor contract.
 */
export async function getPositionsV3(
  categoryInput = 'USDT-FUTURES',
  credentials?: BitgetCredentials
): Promise<BitgetV3Position[]> {
  const result = await fetchPositionsV3(categoryInput, credentials);
  if (!result.ok) {
    throw new Error(
      `Bitget Positions failed [${result.error.code || 'unknown'}]: ${result.error.message}. ${result.error.actionableGuidance}`
    );
  }
  return result.positions;
}

/**
 * Merges position delta updates immutably into a position list.
 * Removes positions when total becomes 0, updates modified positions, or prepends new positions.
 */
export function applyPositionDelta(
  current: BitgetV3Position[],
  updates: BitgetV3Position[]
): BitgetV3Position[] {
  const list = [...current];
  for (const inc of updates) {
    const totalNum = Number.parseFloat(inc.total || '0');
    const idx = list.findIndex(
      (p) => p.symbol === inc.symbol && (p.posSide === inc.posSide || (!p.posSide && !inc.posSide))
    );

    if (totalNum === 0) {
      if (idx !== -1) list.splice(idx, 1);
    } else if (idx !== -1) {
      list[idx] = { ...list[idx], ...inc };
    } else {
      list.unshift(inc);
    }
  }
  return list;
}