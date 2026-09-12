import { tool } from 'ai';
import { macroAnalystParamsSchema } from '@/agent/types';
import { getMacroAnalysis } from '@/lib/bitget/client';

export const macroAnalystTool = tool({
  description:
    'Macroeconomic and cross-asset research tool. Analyzes Fed interest rate policy, 10Y-2Y Treasury yield curve spread, CPI/PCE inflation, jobs data, DXY, VIX, Gold, and cross-asset correlations with crypto and US equities to provide a clear RISK-ON / RISK-OFF verdict.',
  inputSchema: macroAnalystParamsSchema,
  execute: async ({ focus }) => {
    try {
      const data = await getMacroAnalysis(focus);
      return {
        success: true,
        source: 'datahub_mcp',
        ...data,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Macro analysis retrieval failed.',
        actionableGuidance:
          'Macro analysis data retrieval encountered an error. You can retry with focus="full" or query real-time crypto and equity market data directly.',
      };
    }
  },
});
