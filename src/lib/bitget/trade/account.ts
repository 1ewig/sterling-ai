import { safeGetJson } from './fetch';
import { fetchPositionsV3 } from './positions';
import {
  toV3Category,
  type BitgetAccountOverview,
  type BitgetErrorDetails,
  type BitgetV3Category,
  type BitgetV3Position,
} from '../types';

const round2 = (n: number): number => parseFloat(n.toFixed(2));

interface ParsedAssets {
  totalEquityUsd: number;
  usdtEquity: number;
  effEquity: number;
  availableEquity: number;
  mgnRatio: number;
  positionMgnRatio: number;
  positionValue: number;
  unrealisedPnl: number;
  leverage: number;
  assets?: Array<{
    coin: string;
    equity: number;
    usdValue: number;
    balance: number;
    available: number;
    locked: number;
  }>;
}

function toNumber(v: unknown): number {
  if (v === undefined || v === null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parse GET /account/assets `data`. Per official UTA docs the shape is a single object
 * (accountEquity, usdtEquity, effEquity, mgnRatio, positionValue, leverage, assets[]).
 * A per-coin array is still tolerated as a legacy fallback.
 */
function parseAssetsData(data: unknown): ParsedAssets | null {
  if (Array.isArray(data)) {
    // Legacy per-coin array fallback
    let total = 0;
    let available = 0;
    const assetsList = [];
    for (const a of data as Array<{ coin?: string; equity?: string; usdtEquity?: string; available?: string; locked?: string; usdValue?: string }>) {
      const eq = toNumber(a.equity || a.usdtEquity);
      const av = toNumber(a.available);
      total += eq;
      available += av;
      assetsList.push({
        coin: a.coin || 'USDT',
        equity: eq,
        usdValue: toNumber(a.usdValue || eq),
        balance: eq,
        available: av,
        locked: toNumber(a.locked),
      });
    }
    return {
      totalEquityUsd: total,
      usdtEquity: 0,
      effEquity: 0,
      availableEquity: available,
      mgnRatio: 0,
      positionMgnRatio: 0,
      positionValue: 0,
      unrealisedPnl: 0,
      leverage: 0,
      assets: assetsList,
    };
  }

  if (typeof data !== 'object' || data === null) return null;

  const o = data as Record<string, unknown>;
  const rawAssets = Array.isArray(o.assets)
    ? (o.assets as Array<{ coin?: string; equity?: string | number; usdValue?: string | number; balance?: string | number; available?: string | number; locked?: string | number }>)
    : [];

  const parsedAssets = rawAssets.map((a) => ({
    coin: String(a.coin || 'UNKNOWN').toUpperCase(),
    equity: toNumber(a.equity),
    usdValue: toNumber(a.usdValue),
    balance: toNumber(a.balance),
    available: toNumber(a.available),
    locked: toNumber(a.locked),
  }));

  const perCoinAvailable = parsedAssets.reduce((sum, a) => sum + a.available, 0);
  const effEquity = toNumber(o.effEquity);

  // effEquity is the USD-converted collateral usable for margin (matches "available equity").
  const availableEquity = effEquity > 0 ? effEquity : perCoinAvailable;

  return {
    totalEquityUsd: toNumber(o.accountEquity),
    usdtEquity: toNumber(o.usdtEquity),
    effEquity,
    availableEquity,
    mgnRatio: toNumber(o.mgnRatio),
    positionMgnRatio: toNumber(o.positionMgnRatio),
    positionValue: toNumber(o.positionValue),
    unrealisedPnl: toNumber(o.unrealisedPnl),
    leverage: toNumber(o.leverage),
    assets: parsedAssets,
  };
}

const FUTURES_CATEGORIES: BitgetV3Category[] = ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'];

/**
 * Fetch Trading Account Overview (Equity, Margin, Positions) for Bitget UTA v3.
 *
 * Resilience model:
 *  - settings / assets / positions are fetched independently (never throws on partial failure)
 *  - per-source structured diagnostics are returned in `sources` + human-readable `warnings`
 *  - only throws when BOTH settings and assets fail (no usable balance data at all)
 *  - for the `all` category, each futures category is queried and aggregated; SPOT is never
 *    queried because /position/current-position rejects it (verified via live probe)
 */
export async function getAccountOverviewV3(
  categoryInput = 'USDT-FUTURES'
): Promise<BitgetAccountOverview> {
  const settingsPath = '/api/v3/account/settings';
  const assetsPath = '/api/v3/account/assets'; // per docs: no query params

  const [settingsRes, assetsRes] = await Promise.all([
    safeGetJson('GET', settingsPath),
    safeGetJson('GET', assetsPath),
  ]);

  const sources: BitgetAccountOverview['sources'] = {
    settings: { ok: settingsRes.ok, error: settingsRes.error },
    assets: { ok: assetsRes.ok, error: assetsRes.error },
    positions: { ok: true },
  };

  if (!settingsRes.ok && !assetsRes.ok) {
    const primary = settingsRes.error ?? assetsRes.error;
    const code = primary?.code ? `[${primary.code}] ` : '';
    throw new Error(
      `Bitget Account Overview failed (${code}${primary?.message ?? 'unknown error'}). ${primary?.actionableGuidance ?? ''}`
    );
  }

  const warnings: string[] = [];
  if (!settingsRes.ok) {
    const e = settingsRes.error;
    warnings.push(`Account settings unavailable: ${e?.message} — ${e?.actionableGuidance}`);
  }
  if (!assetsRes.ok) {
    const e = assetsRes.error;
    warnings.push(`Balance data unavailable: ${e?.message} — ${e?.actionableGuidance}`);
  }

  // ---- Settings: raw account identity / mode / holding mode
  const settingsData =
    settingsRes.ok && settingsRes.json?.data
      ? (settingsRes.json.data as {
          accountMode?: string;
          accountLevel?: string;
          holdMode?: string;
          assetMode?: string;
          stpMode?: string;
        })
      : undefined;

  const accountLevel = ['basic', 'advanced', 'isolated', 'delta'].includes(
    settingsData?.accountLevel ?? ''
  )
    ? (settingsData?.accountLevel as 'basic' | 'advanced' | 'isolated' | 'delta' | undefined)
    : undefined;
  const holdMode: 'one_way_mode' | 'hedge_mode' | undefined =
    settingsData?.holdMode === 'hedge_mode' || settingsData?.holdMode === 'one_way_mode'
      ? settingsData.holdMode
      : undefined;

  // ---- Assets: single-object UTA shape
  const assetsData = assetsRes.ok && assetsRes.json ? parseAssetsData(assetsRes.json.data) : null;

  // ---- Positions: aggregate all futures categories for 'all'; never query SPOT
  const rawCategory = categoryInput === 'all' ? 'all' : toV3Category(categoryInput);
  const positionCategories: BitgetV3Category[] =
    rawCategory === 'all'
      ? FUTURES_CATEGORIES
      : rawCategory === 'SPOT'
        ? []
        : [rawCategory];

  if (rawCategory === 'SPOT') {
    warnings.push(
      'Spot holdings are reported via account/assets; /position/current-position does not support the SPOT category.'
    );
  }

  const settled = await Promise.allSettled(positionCategories.map((cat) => fetchPositionsV3(cat)));
  const positionsByCategory: Record<string, BitgetV3Position[]> = {};
  const positions: BitgetV3Position[] = [];

  settled.forEach((s, i) => {
    const cat = positionCategories[i];
    const outcome = s.status === 'fulfilled' ? s.value : undefined;
    if (outcome?.ok) {
      positionsByCategory[cat] = outcome.positions;
      positions.push(...outcome.positions);
      return;
    }
    positionsByCategory[cat] = [];
    const err: BitgetErrorDetails =
      outcome && !outcome.ok
        ? outcome.error
        : {
            category: 'EXCHANGE_ERROR',
            message: 'Positions request was rejected.',
            actionableGuidance: 'Retry the request.',
            canRetry: true,
          };
    if (sources?.positions) sources.positions = { ok: false, error: err };
    warnings.push(`Positions query failed for ${cat}: ${err.message} — ${err.actionableGuidance}`);
  });

  // ---- Rollup
  const unrealizedFromPositions = positions.reduce(
    (sum, p) => sum + toNumber(p.unrealisedPnl),
    0
  );
  const unrealizedPnl =
    assetsData && assetsData.unrealisedPnl !== 0
      ? assetsData.unrealisedPnl
      : unrealizedFromPositions;

  return {
    totalEquityUsdt: round2(assetsData?.totalEquityUsd ?? 0),
    usdtEquityUsdt: round2(assetsData?.usdtEquity ?? 0),
    availableEquityUsdt: round2(assetsData?.availableEquity ?? 0),
    unrealizedPnlUsdt: round2(unrealizedPnl),
    marginRatioPercent: round2((assetsData?.mgnRatio ?? 0) * 100),
    positionMgnRatioPercent: round2((assetsData?.positionMgnRatio ?? 0) * 100),
    positionValueUsdt: round2(assetsData?.positionValue ?? 0),
    accountMode: settingsData?.accountMode ?? 'unified',
    accountLevel,
    holdMode,
    assetMode: settingsData?.assetMode,
    stpMode: settingsData?.stpMode,
    effEquityUsdt: assetsData && assetsData.effEquity > 0 ? round2(assetsData.effEquity) : undefined,
    positions,
    positionsByCategory: positionCategories.length > 0 ? positionsByCategory : undefined,
    assets: assetsData?.assets,
    sources,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}