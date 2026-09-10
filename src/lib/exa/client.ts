import type { ExaSearchOptions, ExaSearchResultItem } from './types';

const EXA_API_URL = 'https://api.exa.ai/search';

const NAVIGATION_CHROME_PATTERNS = [
  /^skip to (main |page )?content/i,
  /^skip to (navigation|search|footer|sections)/i,
  /^menu$/i,
  /^sign in/i,
  /^log in/i,
  /^subscribe/i,
  /^watch live/i,
  /^listen live/i,
  /^live tv/i,
  /^markets/i,
  /^cookie (policy|settings|notice|consent)/i,
  /^all rights reserved/i,
  /^terms (of service|& conditions|of use)/i,
  /^privacy policy/i,
  /^advertisement/i,
  /^sponsored content/i,
  /^share this article/i,
  /^related articles/i,
  /^trending now/i,
  /^read more:/i,
  /^follow us on/i,
];

/**
 * Strips navigation chrome, dedupes identical sentences, and removes empty snippets.
 */
function sanitizeHighlights(rawHighlights?: string[]): string[] {
  if (!rawHighlights || !Array.isArray(rawHighlights)) return [];
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const h of rawHighlights) {
    if (typeof h !== 'string') continue;
    const trimmed = h.trim().replace(/^["'`\s]+|["'`\s]+$/g, '');
    if (!trimmed || trimmed.length < 20) continue;
    const isChrome = NAVIGATION_CHROME_PATTERNS.some((p) => p.test(trimmed));
    if (isChrome) continue;

    const normalized = trimmed.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      cleaned.push(trimmed);
    }
  }

  return cleaned;
}

/**
 * Executes an intelligent semantic web search or crypto news query via the Exa AI REST API.
 * Uses search mode 'auto' with customizable category, date ranges, domain scoping, and token-optimized highlights.
 * 
 * @param options - Configurable search parameters with robust defaults
 * @returns Clean, structured search results with diagnostic warnings
 */
export async function searchExa(options: ExaSearchOptions): Promise<{
  query: string;
  results: ExaSearchResultItem[];
  totalResults: number;
  category: string;
  warning?: string;
}> {
  const {
    query,
    type = 'auto',
    numResults = 3,
    category = 'news',
    startPublishedDate,
    endPublishedDate,
    includeDomains,
    excludeDomains,
    livecrawl = 'preferred',
    useAutoprompt = true,
    includeText = true,
    maxTextCharacters = 600,
    highlightsPerUrl = 2,
    apiKey,
  } = options;

  const resolvedApiKey = apiKey ?? process.env.EXA_API_KEY;
  if (!resolvedApiKey) {
    throw new Error('EXA_API_KEY environment variable is not configured. Please set your Exa API key in .env.local to enable web search.');
  }

  const safeNumResults = Math.min(Math.max(numResults, 1), 10);
  const safeHighlightsCount = Math.min(Math.max(highlightsPerUrl, 1), 5);

  const requestBody: Record<string, unknown> = {
    query,
    type,
    numResults: safeNumResults,
    useAutoprompt,
    livecrawl,
    contents: {
      highlights: {
        numSentences: 2,
        highlightsPerUrl: safeHighlightsCount,
      },
      text: includeText ? { maxCharacters: maxTextCharacters } : false,
    },
  };

  // Only apply category filter if not generic
  if (category && category !== 'general') {
    requestBody.category = category;
  }

  if (startPublishedDate) {
    requestBody.startPublishedDate = startPublishedDate;
  }

  if (endPublishedDate) {
    requestBody.endPublishedDate = endPublishedDate;
  }

  if (includeDomains && includeDomains.length > 0) {
    requestBody.includeDomains = includeDomains;
  }

  if (excludeDomains && excludeDomains.length > 0) {
    requestBody.excludeDomains = excludeDomains;
  }

  const response = await fetch(EXA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': resolvedApiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Exa search request failed with status ${response.status}: ${errorText || response.statusText}`);
  }

  const data = (await response.json()) as {
    results?: Array<{
      id?: string;
      title?: string;
      url?: string;
      publishedDate?: string;
      author?: string;
      text?: string;
      highlights?: string[];
      summary?: string;
    }>;
  };

  const results: ExaSearchResultItem[] = (data.results ?? []).map((item, idx) => ({
    id: item.id ?? `exa_res_${idx}_${Date.now()}`,
    title: item.title || 'Untitled Article',
    url: item.url || '',
    publishedDate: item.publishedDate,
    author: item.author,
    text: item.text,
    highlights: sanitizeHighlights(item.highlights),
    summary: item.summary,
  }));

  let warning: string | undefined;
  if (results.length === 0) {
    if (includeDomains && includeDomains.length > 0) {
      warning = `No articles found matching the restricted domain filter (${includeDomains.join(', ')}).`;
    } else if (startPublishedDate || endPublishedDate) {
      warning = 'No articles found within the specified publication date range.';
    } else {
      warning = 'No recent articles or news catalysts found for this query.';
    }
  }

  return {
    query,
    category,
    results,
    totalResults: results.length,
    warning,
  };
}
