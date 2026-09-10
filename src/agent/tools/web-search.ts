import { tool } from 'ai';
import { searchExa, ExaSearchInputSchema } from '@/lib/exa';

/**
 * Web Search Tool powered by Exa AI.
 * Performs semantic search with date filtering, domain scoping, and summary highlights.
 */
export const webSearchTool = tool({
  description:
    'Search the web using Exa AI for real-time information, recent news, market analysis, technical documentation, or research. Supports date filters and domain restrictions. Call whenever you need current or external information.',
  inputSchema: ExaSearchInputSchema,
  execute: async ({
    query,
    symbol,
    category = 'general',
    startPublishedDate,
    endPublishedDate,
    includeDomains,
    numResults = 4,
    includeText = true,
    highlightsPerUrl = 2,
  }) => {
    try {
      const searchQuery = symbol ? `${symbol} ${query}`.trim() : query.trim();
      const searchRes = await searchExa({
        query: searchQuery,
        type: 'auto',
        numResults,
        category,
        startPublishedDate,
        endPublishedDate,
        includeDomains,
        includeText,
        highlightsPerUrl,
      });

      return {
        success: true,
        query: searchQuery,
        category: searchRes.category,
        totalResults: searchRes.totalResults,
        warning: searchRes.warning,
        articles: searchRes.results.map((r) => ({
          id: r.id,
          title: r.title,
          url: r.url,
          publishedDate: r.publishedDate,
          author: r.author,
          highlights: r.highlights,
          text: r.text,
        })),
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Web search failed',
      };
    }
  },
});
