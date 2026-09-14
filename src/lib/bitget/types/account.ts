import { z } from 'zod';
import type { BitgetErrorDetails } from './errors';

export interface BitgetV3Position {
  symbol: string;
  posSide: 'long' | 'short' | 'net';
  total: string;
  available: string;
  frozen?: string;
  avgPrice: string;
  markPrice: string;
  liquidationPrice: string;
  leverage: string | number;
  unrealisedPnl: string;
  profitRate?: string;
  mmr: string;
  breakEvenPrice?: string;
  marginMode: 'crossed' | 'isolated';
  holdMode?: 'single_hold' | 'double_hold';
  positionStatus?: 'normal' | 'liquidation';
  cTime?: string;
  uTime?: string;
  // Compatibility fields for legacy consumers
  openPriceAvg?: string;
  unrealizedPL?: string;
  holdSide?: 'long' | 'short' | 'net';
  marginCoin?: string;
  margin?: string;
  marginRate?: string;
  locked?: string;
}

export interface BitgetAccountSource {
  ok: boolean;
  error?: BitgetErrorDetails;
}

export interface BitgetAssetBalance {
  coin: string;
  equity: number;
  usdValue: number;
  balance: number;
  available: number;
  locked: number;
}

export interface BitgetAccountOverview {
  totalEquityUsdt: number;
  /** USDT-denominated equity (assets.usdtEquity) */
  usdtEquityUsdt?: number;
  availableEquityUsdt: number;
  unrealizedPnlUsdt: number;
  marginRatioPercent: number;
  /** assets.positionMgnRatio as percent */
  positionMgnRatioPercent?: number;
  /** Raw UTA account mode: unified | hybrid | upgrading | switching */
  accountMode: string;
  /** Account level: basic | advanced | isolated | delta */
  accountLevel?: string;
  /** Holding mode: one_way_mode | hedge_mode — determines posSide/reduceOnly placement rules */
  holdMode?: 'one_way_mode' | 'hedge_mode';
  assetMode?: string;
  stpMode?: string;
  effEquityUsdt?: number;
  positionValueUsdt?: number;
  positions: BitgetV3Position[];
  positionsByCategory?: Record<string, BitgetV3Position[]>;
  /** Spot & Collateral coin balances */
  assets?: BitgetAssetBalance[];
  /** Per-source diagnostics so partial failures degrade gracefully instead of throwing */
  sources?: {
    settings: BitgetAccountSource;
    assets: BitgetAccountSource;
    positions: BitgetAccountSource;
  };
  warnings?: string[];
}

export const accountOverviewParamsSchema = z.object({
  category: z
    .enum(['all', 'spot', 'usdt-futures', 'coin-futures', 'usdc-futures'])
    .default('all')
    .describe('Scope of account overview to query. "all" aggregates USDT/COIN/USDC futures positions; spot holdings are reported via account assets.'),
});
