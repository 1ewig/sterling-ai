import { tool } from 'ai';
import { accountOverviewParamsSchema } from '@/lib/bitget/types';
import { getAccountOverviewV3 } from '@/lib/bitget/trade';

export const accountOverviewTool = tool({
  description:
    'Query the real-time Bitget Unified Trading Account (UTA v3) balance, total equity in USDT, available collateral, and open positions with unrealized PnL and liquidation margins.',
  inputSchema: accountOverviewParamsSchema,
  execute: async ({ category = 'all' }) => {
    try {
      const overview = await getAccountOverviewV3();

      return {
        success: true,
        category,
        accountMode: overview.accountMode,
        totalEquityUsdt: overview.totalEquityUsdt,
        availableEquityUsdt: overview.availableEquityUsdt,
        unrealizedPnlUsdt: overview.unrealizedPnlUsdt,
        marginRatioPercent: overview.marginRatioPercent,
        positionCount: overview.positions.length,
        positions: overview.positions.map((p) => ({
          symbol: p.symbol,
          holdSide: p.holdSide,
          size: p.total,
          leverage: `${p.leverage}x`,
          entryPrice: parseFloat(p.openPriceAvg || '0'),
          markPrice: parseFloat(p.markPrice || '0'),
          liquidationPrice: parseFloat(p.liquidationPrice || '0'),
          unrealizedPnl: parseFloat(p.unrealizedPL || '0'),
          marginMode: p.marginMode,
        })),
        summary:
          overview.positions.length > 0
            ? `Active Positions: ${overview.positions.length} contracts open with total unrealized PnL of ${overview.unrealizedPnlUsdt >= 0 ? '+' : ''}$${overview.unrealizedPnlUsdt.toFixed(2)}.`
            : 'No open positions on Bitget v3. Account is 100% in cash/collateral.',
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to query account balance.',
        actionableGuidance:
          'To query live balances and positions, ensure BITGET_API_KEY, BITGET_API_SECRET, and BITGET_PASSPHRASE are configured in .env.local.',
      };
    }
  },
});
