import { tool } from 'ai';
import { accountOverviewParamsSchema } from '@/lib/bitget/types';
import { getAccountOverviewV3 } from '@/lib/bitget/trade';

export const accountOverviewTool = tool({
  description:
    'Query the real-time Bitget Unified Trading Account (UTA v3) balance, total equity in USDT, available collateral, margin and position MMR, holding mode, and open positions with unrealized PnL and liquidation margins. Degrades gracefully: if position queries fail, balance/equity data is still returned with a warning. Use holdMode to decide one-way vs hedge position semantics.',
  inputSchema: accountOverviewParamsSchema,
  execute: async ({ category = 'all' }) => {
    try {
      const overview = await getAccountOverviewV3(category);

      const positions = overview.positions;
      const sourcesHealthy = overview.sources?.settings.ok !== false || overview.sources?.assets.ok !== false;

      return {
        success: true,
        category,
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
        warnings: overview.warnings && overview.warnings.length > 0 ? overview.warnings : undefined,
        sourcesHealthy,
        summary: buildSummary(category, overview.totalEquityUsdt, overview.unrealizedPnlUsdt, positions.length),
        actionableGuidance: sourcesHealthy
          ? undefined
          : (overview.warnings?.[0] ?? 'Some account data sources failed. Retry the request.'),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to query account balance.';
      const isMissingConfig = message.includes('BITGET_API_KEY') || message.includes('credentials not configured');

      return {
        success: false,
        error: message,
        actionableGuidance: isMissingConfig
          ? 'Bitget API credentials are missing. Set BITGET_API_KEY, BITGET_API_SECRET, and BITGET_PASSPHRASE in .env.local.'
          : message.includes('failed [')
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

function buildSummary(category: string, totalEquity: number, unrealizedPnl: number, positionCount: number): string {
  const pnl = `${unrealizedPnl >= 0 ? '+' : ''}$${unrealizedPnl.toFixed(2)}`;
  return positionCount > 0
    ? `Active Positions (${category.toUpperCase()}): ${positionCount} contracts open with total unrealized PnL of ${pnl}.`
    : `No open positions in ${category.toUpperCase()}. Equity $${totalEquity.toFixed(2)} is available as collateral.`;
}