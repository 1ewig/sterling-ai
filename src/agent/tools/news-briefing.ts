import { tool } from 'ai';
import { newsBriefingParamsSchema } from '@/lib/bitget/types';
import { getNewsBriefing } from '@/lib/bitget/client';

export const newsBriefingTool = tool({
  description:
    'Aggregated financial and crypto news briefings. Filters breaking news catalysts, Fed announcements, institutional ETF flow updates, tech earnings, and dominant narrative trends.',
  inputSchema: newsBriefingParamsSchema,
  execute: async ({ topic, category }) => {
    try {
      const data = await getNewsBriefing(topic, category);
      return {
        success: true,
        ...data,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'News briefing retrieval failed.',
      };
    }
  },
});
