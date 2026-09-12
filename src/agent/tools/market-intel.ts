import { tool } from 'ai';
import { marketIntelParamsSchema } from '@/lib/bitget/types';
import { getMarketIntel } from '@/lib/bitget/client';

export const marketIntelTool = tool({
  description:
    'On-chain and institutional intelligence tool. Tracks DeFi Total Value Locked (TVL) across major chains (Ethereum, Solana, Arbitrum), stablecoin dry powder supply trends, trending DEX tokens, and blockchain gas/mempool health.',
  inputSchema: marketIntelParamsSchema,
  execute: async ({ scope }) => {
    try {
      const data = await getMarketIntel(scope);
      return {
        success: true,
        ...data,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Market intelligence retrieval failed.',
        actionableGuidance: 'Market intelligence query failed. You can retry with scope="all" or use technical_analysis and market_data tools.',
      };
    }
  },
});
