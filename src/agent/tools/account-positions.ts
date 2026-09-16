import { tool } from 'ai';
import { accountOverviewParamsSchema } from '@/lib/bitget/types';
import { getAccountOverviewV3 } from '@/lib/bitget/trade';
import { getSandboxAccountOverview } from '@/lib/sandbox/sandbox-broker';
import { isMissingConfigError } from '@/lib/sandbox/trading-mode';

export const accountOverviewTool = tool({
  description:
    'Query the real-time Bitget Unified Trading Account (UTA v3) balance, total equity in USDT, available collateral, margin and position MMR, holding mode, and open positions with unrealized PnL and liquidation margins. If API keys are not configured, seamlessly returns the active $100,000 Sandbox Paper Trading portfolio.',
  inputSchema: accountOverviewParamsSchema,
  execute: async ({ category = 'all' }) => {
    const hasLiveCredentials = Boolean(
      process.env.BITGET_API_KEY &&
      process.env.BITGET_API_SECRET &&
      process.env.BITGET_PASSPHRASE
    );

    try {
      const overview = hasLiveCredentials
        ? await getAccountOverviewV3(category)
        : getSandboxAccountOverview();

      const positions = overview.positions || [];
      const isSandbox = !hasLiveCredentials;
      const sourcesHealthy = overview.sources?.settings.ok !== false || overview.sources?.assets.ok !== false;

      return {
        success: true,
        category,
        isSandbox,
        accountMode: overview.accountMode,
        accountLevel: overview.accountLevel || undefined,
        holdMode: overview.holdMode,
        assetMode: overview.assetMode,
        totalEquityUsdt: overview.totalEquityUsdt,
        usdtEquityUsdt: overview.usdtEquityUsdt,
        effEquityUsdt: overview.effEquityUsdt,
        availableEquityUsdt: overview.availableEquityUsdt,
        unrealizedPnlUsdt: overview.unrealizedPnlUsdt,
        positionValueUsdt: overview.positionValueUsdt,
        marginRatioPercent: overview.marginRatioPercent,
        positionMgnRatioPercent: overview.positionMgnRatioPercent,
        positionCount: positions.length,
        positions: positions.map((p) => ({
          symbol: p.symbol,
          posSide: p.posSide || p.holdSide || 'net',
          holdSide: p.posSide || p.holdSide || 'net',
          size: p.total,
          leverage: `${p.leverage}x`,
          entryPrice: toNumber(p.avgPrice || p.openPriceAvg),
          markPrice: toNumber(p.markPrice),
          liquidationPrice: toNumber(p.liquidationPrice),
          unrealizedPnl: toNumber(p.unrealisedPnl || p.unrealizedPL),
          profitRate: p.profitRate ? `${(toNumber(p.profitRate) * 100).toFixed(2)}%` : undefined,
          marginMode: p.marginMode,
        })),
        spotAssets: (overview.assets || []).filter((a) => a.balance > 0 || a.locked > 0),
        warnings: isSandbox
          ? ['Operating in Sandbox Paper Trading mode ($100,000 USDT paper balance).']
          : overview.warnings && overview.warnings.length > 0
            ? overview.warnings
            : undefined,
        sourcesHealthy: true,
        summary: buildSummary(category, overview.totalEquityUsdt, overview.unrealizedPnlUsdt, positions.length, overview.assets, isSandbox),
        actionableGuidance: isSandbox
          ? 'Live Bitget credentials not configured on server. Operating in $100,000 Sandbox Paper Trading. You can connect a live Bitget account via the API Keys modal in the sidebar.'
          : sourcesHealthy
            ? undefined
            : (overview.warnings?.[0] ?? 'Some account data sources failed. Retry the request.'),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to query account balance.';
      const isMissingConfig = isMissingConfigError(message);

      if (isMissingConfig) {
        const overview = getSandboxAccountOverview();
        const positions = overview.positions || [];
        return {
          success: true,
          category,
          isSandbox: true,
          accountMode: overview.accountMode,
          holdMode: overview.holdMode,
          totalEquityUsdt: overview.totalEquityUsdt,
          usdtEquityUsdt: overview.usdtEquityUsdt,
          availableEquityUsdt: overview.availableEquityUsdt,
          unrealizedPnlUsdt: overview.unrealizedPnlUsdt,
          positionCount: positions.length,
          positions: [],
          spotAssets: overview.assets || [],
          warnings: ['Operating in Sandbox Paper Trading mode ($100,000 USDT paper balance).'],
          sourcesHealthy: true,
          summary: buildSummary(category, overview.totalEquityUsdt, overview.unrealizedPnlUsdt, 0, overview.assets, true),
          actionableGuidance: 'Operating in $100,000 Sandbox Paper Trading mode.',
        };
      }

      return {
        success: false,
        error: message,
        actionableGuidance: message.includes('failed [')
          ? message
          : `Failed to query Bitget account. ${message}`,
      };
    }
  },
});

function toNumber(v: string | number | undefined): number {
  if (v === undefined || v === null || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function buildSummary(
  category: string,
  totalEquity: number,
  unrealizedPnl: number,
  positionCount: number,
  assets?: Array<{ coin: string; balance: number; locked: number; usdValue: number }>,
  isSandbox?: boolean
): string {
  const pnl = `${unrealizedPnl >= 0 ? '+' : ''}$${unrealizedPnl.toFixed(2)}`;
  const holdingCoins = (assets || [])
    .filter((a) => a.balance > 0 && a.coin !== 'USDT')
    .map((a) => `${a.balance.toFixed(4)} ${a.coin}`)
    .join(', ');

  const spotSummary = holdingCoins ? ` | Spot Holdings: ${holdingCoins}` : '';
  const prefix = isSandbox ? '[Sandbox Paper Trading] ' : '';

  return positionCount > 0
    ? `${prefix}Active Positions (${category.toUpperCase()}): ${positionCount} contracts open with total unrealized PnL of ${pnl} (Total Equity: $${totalEquity.toFixed(2)}${spotSummary}).`
    : `${prefix}Total Equity: $${totalEquity.toFixed(2)} (Unrealized PnL: ${pnl}${spotSummary}). No active futures contracts open.`;
}