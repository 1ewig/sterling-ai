import { FOLLOW_UP_TAG_REGEX, INCOMPLETE_FOLLOW_UP_TAG_REGEX } from './sanitizer';

export { FOLLOW_UP_TAG_REGEX, INCOMPLETE_FOLLOW_UP_TAG_REGEX };

export interface ExtractedFollowUpsResult {
  followUpQuestions: string[];
  cleanedText: string;
}

const FALLBACK_FOLLOW_UPS = [
  'Analyze current market sentiment and funding rates',
  'Check key support, resistance, and invalidation levels',
  'Cross-reference macro catalysts and Treasury yield curve impact',
];

/**
 * Returns 3 intelligent fallback follow-up questions.
 */
function getFallbackFollowUpQuestions(): string[] {
  return [...FALLBACK_FOLLOW_UPS];
}

/**
 * Extracts exactly 3 follow-up questions from the agent output and strips <follow_up_questions> markup.
 */
export function extractFollowUpQuestions(rawText: string): ExtractedFollowUpsResult {
  const match = rawText.match(/<follow_up_questions>([\s\S]*?)<\/follow_up_questions>/i);
  const fallbacks = getFallbackFollowUpQuestions();

  const parsed = match?.[1]
    ?.split('\n')
    .map((line) => line.replace(/^[\s*\-•\d.)\]>]+/, '').replace(/^["'`]+|["'`]+$/g, '').trim())
    .filter((q) => q.length > 5) || [];

  const questions = Array.from(new Set([...parsed, ...fallbacks])).slice(0, 3);
  const cleanedText = rawText
    .replace(FOLLOW_UP_TAG_REGEX, '')
    .replace(INCOMPLETE_FOLLOW_UP_TAG_REGEX, '')
    .trim();

  return { followUpQuestions: questions, cleanedText };
}
