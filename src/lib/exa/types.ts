import { z } from 'zod';

/**
 * Exa Search result item interface
 */
export interface ExaSearchResultItem {
  id: string;
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  text?: string;
  highlights?: string[];
  summary?: string;
}

/**
 * Exa Search response structure
 */
export interface ExaSearchResponse {
  results: ExaSearchResultItem[];
  autopromptString?: string;
}

/**
 * Parameters for executing a crypto news or web search via Exa
 */
export interface ExaSearchOptions {
  query: string;
  type?: 'auto';
  numResults?: number;
  category?: 'news' | 'company' | 'research paper' | 'financial report' | 'general';
  startPublishedDate?: string;
  endPublishedDate?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  livecrawl?: 'preferred' | 'always' | 'fallback';
  useAutoprompt?: boolean;
  includeText?: boolean;
  maxTextCharacters?: number;
  highlightsPerUrl?: number;
  apiKey?: string;
}

/**
 * ISO 8601 / Date validator helper
 */
const dateStringSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      const parsed = Date.parse(val);
      return !Number.isNaN(parsed);
    },
    { message: 'Must be a valid ISO 8601 date string (e.g. "2026-09-01T00:00:00Z" or "2026-09-01")' }
  );

/**
 * Zod validation schema for Exa search tool arguments with robust validation:
 * - Query length & repetitive gibberish pattern guards
 * - Logical date range verification (start <= end, start not in future)
 * - Safe numResults & highlights boundaries
 */
export const ExaSearchInputSchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(2, 'Search query must be at least 2 characters')
      .max(250, 'Search query cannot exceed 250 characters')
      .refine(
        (val) => !/([a-zA-Z0-9])\1{7,}/i.test(val),
        { message: 'Search query contains repetitive character patterns or invalid keyboard mash.' }
      )
      .describe('Natural language search query for news, catalysts, events, or crypto narratives'),
    symbol: z
      .string()
      .trim()
      .min(2, 'Symbol must be at least 2 characters')
      .max(20, 'Symbol cannot exceed 20 characters')
      .regex(/^[A-Za-z0-9/_-]+$/, 'Trading symbol must be alphanumeric (e.g. SOL, BTC, ETH, SOLUSDT)')
      .optional()
      .describe('Optional trading symbol context (e.g. SOL, BTC, ETH, SOLUSDT)'),
    category: z
      .enum(['news', 'company', 'financial report', 'research paper', 'general'])
      .default('news')
      .describe('Search corpus category focus (default: news)'),
    startPublishedDate: dateStringSchema
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const time = Date.parse(val);
          // Allow up to 24h into future for timezone offsets
          return time <= Date.now() + 86_400_000;
        },
        { message: 'startPublishedDate cannot be set in the future.' }
      )
      .describe('Optional ISO 8601 publication start date to filter breaking or recent news (e.g. "2026-09-04T00:00:00Z" for last 24h)'),
    endPublishedDate: dateStringSchema
      .optional()
      .describe('Optional ISO 8601 publication end date'),
    includeDomains: z
      .array(z.string().trim().min(3))
      .optional()
      .describe('Optional list of authoritative domains to restrict search to (e.g. ["coindesk.com", "theblock.co"])'),
    numResults: z
      .coerce
      .number({ message: 'numResults must be a number' })
      .int('numResults must be an integer')
      .min(1, 'numResults must be at least 1')
      .max(10, 'numResults cannot exceed 10')
      .default(3)
      .describe('Number of results to return (default: 3, max: 10)'),
    includeText: z
      .boolean()
      .default(true)
      .describe('Whether to fetch page text preview (default: true)'),
    highlightsPerUrl: z
      .coerce
      .number({ message: 'highlightsPerUrl must be a number' })
      .int('highlightsPerUrl must be an integer')
      .min(1, 'highlightsPerUrl must be at least 1')
      .max(5, 'highlightsPerUrl cannot exceed 5')
      .default(2)
      .describe('Number of key sentence highlights per URL (default: 2)'),
  })
  .superRefine((data, ctx) => {
    if (data.startPublishedDate && data.endPublishedDate) {
      const startTime = Date.parse(data.startPublishedDate);
      const endTime = Date.parse(data.endPublishedDate);
      if (startTime > endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['startPublishedDate'],
          message: `Invalid date range: startPublishedDate (${data.startPublishedDate}) must be earlier than or equal to endPublishedDate (${data.endPublishedDate}).`,
        });
      }
    }
  });

export type ExaSearchInput = z.infer<typeof ExaSearchInputSchema>;
