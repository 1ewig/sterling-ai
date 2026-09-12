import { tool } from 'ai';
import { technicalAnalysisParamsSchema } from '@/agent/types';
import { getTechnicalAnalysis, normalizeSymbol } from '@/lib/bitget/client';

export const technicalAnalysisTool = tool({
  description:
    'Run comprehensive multi-indicator technical analysis on any crypto, commodity, or tokenized US equity pair (RSI 14, MACD, 20/50/200 EMAs, Bollinger Bands, SuperTrend, Average True Range, and Fibonacci levels).',
  inputSchema: technicalAnalysisParamsSchema,
  execute: async ({ symbol, granularity, limit }) => {
    const normalized = normalizeSymbol(symbol);
    try {
      const report = await getTechnicalAnalysis(symbol, granularity, limit);
      return {
        success: true,
        ...report,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Technical analysis computation failed.';
      return {
        success: false,
        error: errorMsg,
        requestedSymbol: symbol,
        normalizedSymbol: normalized,
        requestedGranularity: granularity,
        actionableGuidance:
          `Unable to compute technical indicators for "${symbol}". Ensure the pair is actively traded. Valid timeframes: "15min", "1h", "4h", "1d", "1w". Recommended candle limit: 100.`,
        validGranularities: ['15min', '1h', '4h', '1d', '1w'],
        suggestedPairs: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'TSLAUSDT', 'NVDAUSDT', 'SPYUSDT', 'XAUUSDT'],
      };
    }
  },
});
