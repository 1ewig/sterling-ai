import { tool } from 'ai';
import { technicalAnalysisParamsSchema } from '@/lib/bitget/types';
import { getTechnicalAnalysis } from '@/lib/bitget/client';

export const technicalAnalysisTool = tool({
  description:
    'Run comprehensive multi-indicator technical analysis on any crypto or tokenized US equity pair (RSI 14, MACD, 20/50/200 EMAs, Bollinger Bands, SuperTrend, Average True Range, and Fibonacci levels).',
  inputSchema: technicalAnalysisParamsSchema,
  execute: async ({ symbol, granularity, limit }) => {
    try {
      const report = await getTechnicalAnalysis(symbol, granularity, limit);
      return {
        success: true,
        ...report,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Technical analysis computation failed.',
      };
    }
  },
});
