import { tool } from 'ai';
import { sentimentAnalystParamsSchema } from '@/agent/types';
import { getSentimentAnalysis, normalizeSymbol } from '@/lib/bitget/client';

export const sentimentAnalystTool = tool({
  description:
    'Crypto and market sentiment positioning analysis tool. Synthesizes the Fear & Greed Index, Retail Long/Short ratio, Top Trader Long/Short ratio (smart money vs retail divergence), Taker Buy/Sell volume ratio, Futures Open Interest, and squeeze risk.',
  inputSchema: sentimentAnalystParamsSchema,
  execute: async ({ symbol, timeframe }) => {
    const normalized = normalizeSymbol(symbol);
    try {
      const data = await getSentimentAnalysis(symbol, timeframe);
      return {
        success: true,
        source: 'datahub_mcp + bitget_v3',
        ...data,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Sentiment analysis retrieval failed.',
        requestedSymbol: symbol,
        normalizedSymbol: normalized,
        actionableGuidance:
          `Sentiment positioning query for "${symbol}" failed. Supported timeframes: "1h", "4h", "1d". Major supported derivatives symbols: BTCUSDT, ETHUSDT, SOLUSDT.`,
      };
    }
  },
});
