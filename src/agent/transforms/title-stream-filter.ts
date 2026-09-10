import {
  SESSION_TITLE_TAG_REGEX,
  INCOMPLETE_SESSION_TITLE_TAG_REGEX,
  sanitizeAgentText,
} from './sanitizer';

export { SESSION_TITLE_TAG_REGEX, INCOMPLETE_SESSION_TITLE_TAG_REGEX, sanitizeAgentText };

const DEFAULT_SESSION_TITLES = ['Active Session', 'General Inquiry', 'New Chat', 'Chat', 'Active Chat'] as const;

/**
 * Checks if a session title matches a placeholder / default name.
 */
export function isDefaultSessionTitle(title?: string | null): boolean {
  if (!title) return true;
  return (DEFAULT_SESSION_TITLES as readonly string[]).includes(title);
}

/**
 * Result of extracting a session title from raw agent output
 */
export interface ExtractedTitleResult {
  sessionTitle?: string;
  cleanedText: string;
}

/**
 * Generates an intelligent, natural 2-4 word session title from the user prompt.
 */
export function generateFallbackSessionTitle(prompt: string): string {
  const cleanPrompt = (prompt || '').trim();

  const matchedCoin =
    cleanPrompt.toUpperCase().match(/\b(BTC|ETH|SOL|BNB|XRP|DOGE|ADA|AVAX|LINK|SUI|PEPE|SHIB|NEAR|APT|RENDER|TAO|FET|ARB|OP|DOT)\b/)?.[1];

  const coinPrefix = matchedCoin ? `${matchedCoin} ` : '';

  if (/\b(PRICE|HOW MUCH|WORTH|VALUE|COST)\b/i.test(cleanPrompt)) {
    return coinPrefix ? `${coinPrefix}Price Check` : 'Market Price Check';
  }
  if (/\b(DEPTH|ORDER BOOK|BIDS?|ASKS?|WALLS?|SPREAD|SLIPPAGE)\b/i.test(cleanPrompt)) {
    return coinPrefix ? `${coinPrefix}Order Book Depth` : 'Order Book Liquidity';
  }
  if (/\b(FUNDING|RATES?|OI|OPEN INTEREST|LONG|SHORT|RATIO)\b/i.test(cleanPrompt)) {
    return coinPrefix ? `${coinPrefix}Funding & Sentiment` : 'Futures Sentiment';
  }
  if (/\b(NEWS|CATALYST|EVENT|WHY|PUMP|DUMP|UPDATE)\b/i.test(cleanPrompt)) {
    return coinPrefix ? `${coinPrefix}News & Drivers` : 'Market News & Catalysts';
  }
  if (/\b(STATS|24H|VOLUME|HIGH|LOW|CHANGE|PERFORMANCE)\b/i.test(cleanPrompt)) {
    return coinPrefix ? `${coinPrefix}24h Market Stats` : '24h Market Stats';
  }
  if (/\b(KLINES?|CANDLES?|CHART|TREND|EMA|RSI|TECHNICAL)\b/i.test(cleanPrompt)) {
    return coinPrefix ? `${coinPrefix}Technical Trend` : 'Technical Trend Analysis';
  }
  if (/\b(MOVER|GAINER|LOSER|TOP|COMPARE)\b/i.test(cleanPrompt)) {
    return 'Top Market Movers';
  }

  const words = cleanPrompt.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.length <= 4 && cleanPrompt.length <= 30) {
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  return matchedCoin ? `${matchedCoin} Market Analysis` : 'Market Analysis';
}

/**
 * Extracts and removes <session_title> tags from accumulated agent text.
 */
export function extractSessionTitle(
  rawText: string,
  fallbackTitle?: string,
  prompt?: string,
  isFirstTurn?: boolean
): ExtractedTitleResult {
  const titleMatch =
    rawText.match(/<session_title>([\s\S]*?)<\/session_title>/i) ||
    rawText.match(/<title>([\s\S]*?)<\/title>/i) ||
    rawText.match(/\[session_title:\s*([^\]]+)\]/i) ||
    rawText.match(/<session_title>([^\n<]+)/i);

  const rawTitle = titleMatch ? titleMatch[1].trim() : undefined;
  let sessionTitle =
    fallbackTitle ?? (rawTitle ? rawTitle.replace(/^["'`]+|["'`]+$/g, '').trim() : undefined);

  if (!sessionTitle && isFirstTurn && prompt) {
    sessionTitle = generateFallbackSessionTitle(prompt);
  }

  let cleanedText = rawText
    .replace(/<session_title>[\s\S]*?<\/session_title>\s*/gi, '')
    .replace(/<title>[\s\S]*?<\/title>\s*/gi, '')
    .replace(/\[session_title:\s*[^\]]+\]\s*/gi, '')
    .replace(/<session_title>[^\n<]*\n?/gi, '')
    .trim();

  if (!cleanedText && sessionTitle) {
    cleanedText = `Started a new chat for **${sessionTitle}**. What would you like to explore or research today?`;
  }

  return { sessionTitle, cleanedText };
}
