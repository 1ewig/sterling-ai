import type { ChatMessageRecord } from '@/lib/db';

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const DEFAULT_CONTEXT_WINDOW_LIMIT = 10;

/**
 * Prepares a sliding context window of past valid messages for LLM inference.
 * Filters out error states and limits the history depth to prevent prompt overflow.
 *
 * @param messages - Complete message list from the active session
 * @param limit - Max number of recent messages to retain (default: 10)
 * @returns Array of role/content pairs suitable for agent prompting
 */
export function prepareConversationHistory(
  messages: ChatMessageRecord[],
  limit: number = DEFAULT_CONTEXT_WINDOW_LIMIT
): ChatHistoryMessage[] {
  return messages
    .filter((m) => m.status !== 'error')
    .slice(-limit)
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));
}
