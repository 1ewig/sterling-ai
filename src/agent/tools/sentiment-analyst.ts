import { tool } from 'ai';
import { sentimentAnalystParamsSchema } from '@/lib/bitget/types';
import { getSentimentAnalysis } from '@/lib/bitget/client';

export const sentimentAnalystTool = tool({
  description:
    'Crypto and market sentiment positioning analysis tool. Synthesizes the Fear & Greed Index, Retail Long/Short ratio, Top Trader Long/Short ratio (smart money vs retail divergence), Taker Buy/Sell volume ratio, Futures Open Interest, and squeeze risk.',
  inputSchema: sentimentAnalystParamsSchema,
  execute: async ({ symbol, timeframe }) => {
    try {
      const data = await getSentimentAnalysis(symbol, timeframe);
      return {
        success: true,
        ...data,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Sentiment analysis retrieval failed.',
      };
    }
  },
});
