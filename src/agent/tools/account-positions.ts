import { tool } from 'ai';
import { accountOverviewParamsSchema } from '@/lib/bitget/types';
import { getAccountOverviewV3 } from '@/lib/bitget/trade';

export const accountOverviewTool = tool({
  description:
    'Query the real-time Bitget Unified Trading Account (UTA v3) balance, total equity in USDT, available collateral, and open positions with unrealized PnL and liquidation margins.',
  inputSchema: accountOverviewParamsSchema,
  execute: async ({ category = 'all' }) => {
    try {
      const overview = await getAccountOverviewV3(category);

      return {
        success: true,
        category,
        accountMode: overview.accountMode,
        accountLevel: overview.accountLevel || overview.accountMode,
        totalEquityUsdt: overview.totalEquityUsdt,
        effEquityUsdt: overview.effEquityUsdt,
        availableEquityUsdt: overview.availableEquityUsdt,
        unrealizedPnlUsdt: overview.unrealizedPnlUsdt,
        positionValueUsdt: overview.positionValueUsdt,
        marginRatioPercent: overview.marginRatioPercent,
        positionCount: overview.positions.length,
        positions: overview.positions.map((p) => ({
          symbol: p.symbol,
          posSide: p.posSide || p.holdSide || 'net',
          holdSide: p.posSide || p.holdSide || 'net',
          size: p.total,
          leverage: `${p.leverage}x`,
          entryPrice: parseFloat(p.avgPrice || p.openPriceAvg || '0'),
          markPrice: parseFloat(p.markPrice || '0'),
          liquidationPrice: parseFloat(p.liquidationPrice || '0'),
          unrealizedPnl: parseFloat(p.unrealisedPnl || p.unrealizedPL || '0'),
          profitRate: p.profitRate ? `${(parseFloat(p.profitRate) * 100).toFixed(2)}%` : undefined,
          marginMode: p.marginMode,
        })),
        summary:
          overview.positions.length > 0
            ? `Active Positions (${category.toUpperCase()}): ${overview.positions.length} contracts open with total unrealized PnL of ${overview.unrealizedPnlUsdt >= 0 ? '+' : ''}$${overview.unrealizedPnlUsdt.toFixed(2)} (Margin Ratio: ${overview.marginRatioPercent}%).`
            : `No open positions in ${category.toUpperCase()}. Account is in collateral.`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to query account balance.';
      const isMissingConfig = message.includes('BITGET_API_KEY') || message.includes('credentials not configured');

      return {
        success: false,
        error: message,
        actionableGuidance: isMissingConfig
          ? 'Bitget API credentials are missing. Set BITGET_API_KEY, BITGET_API_SECRET, and BITGET_PASSPHRASE in .env.local to access account balances.'
          : message.includes('failed [')
          ? message
          : `Failed to query Bitget account. ${message}`,
      };
    }
  },
});
