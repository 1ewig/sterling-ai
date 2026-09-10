import type { AgentExecutionStep } from '@/agent/types';
import {
  DEFAULT_CONVERSATION_ID,
  DEFAULT_CONVERSATION_TITLE,
  MAX_MESSAGES_PER_CONVERSATION,
  type ChatMessageRecord,
  db,
} from './schema';

/**
 * Normalizes a ChatMessageRecord's steps for presentation.
 */
export function normalizeMessageSteps(
  message: Pick<ChatMessageRecord, 'id' | 'steps' | 'toolCalls' | 'timestamp'>,
  isStreaming: boolean = false
): AgentExecutionStep[] {
  if (message.steps && message.steps.length > 0) {
    return message.steps
      .filter(
        (s) =>
          s.type !== 'thinking' ||
          Boolean(s.reasoningText?.trim()) ||
          (isStreaming && s.status === 'active')
      )
      .map((s) => {
        if (s.status === 'active' && !isStreaming) {
          return {
            ...s,
            status: s.toolResult ? ('completed' as const) : ('error' as const),
            toolResult: s.toolResult ?? {
              success: false,
              error: 'Tool execution was interrupted or failed',
            },
          };
        }
        return s;
      });
  }
  if (message.toolCalls && message.toolCalls.length > 0) {
    return message.toolCalls.map((t, idx) => ({
      id: `step_legacy_tool_${message.id}_${idx}`,
      type: 'tool' as const,
      toolName: t.toolName,
      label: t.toolName,
      status: 'completed' as const,
      timestamp: message.timestamp,
    }));
  }
  return [];
}

/**
 * Persists a new chat message into Dexie IndexedDB with auto-title and pruning
 */
export async function saveStoredMessage(msg: ChatMessageRecord): Promise<string> {
  if (typeof window === 'undefined') return msg.id;

  const conversationId = msg.conversationId || DEFAULT_CONVERSATION_ID;
  const normalizedMsg: ChatMessageRecord = {
    ...msg,
    conversationId,
    status: msg.status || 'success',
  };

  await db.messages.put(normalizedMsg);

  const conv = await db.conversations.get(conversationId);
  if (conv) {
    await db.conversations.update(conversationId, { updatedAt: Date.now() });
  } else {
    await db.conversations.put({
      id: conversationId,
      title: DEFAULT_CONVERSATION_TITLE,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  void pruneConversationMessages(conversationId, MAX_MESSAGES_PER_CONVERSATION);

  return msg.id;
}



/**
 * Retrieves messages for a specific conversation ordered chronologically
 */
export async function getConversationMessages(conversationId: string): Promise<ChatMessageRecord[]> {
  if (typeof window === 'undefined') return [];
  return db.messages
    .where('conversationId')
    .equals(conversationId)
    .sortBy('timestamp');
}

/**
 * Counts messages for a specific conversation
 */
export async function getConversationMessageCount(conversationId: string): Promise<number> {
  if (typeof window === 'undefined') return 0;
  return db.messages.where('conversationId').equals(conversationId).count();
}

/**
 * Prunes older messages exceeding the max retention limit.
 */
async function pruneConversationMessages(
  conversationId: string,
  maxLimit: number = MAX_MESSAGES_PER_CONVERSATION
): Promise<void> {
  if (typeof window === 'undefined') return;

  const count = await db.messages.where('conversationId').equals(conversationId).count();
  if (count > maxLimit) {
    const excess = count - maxLimit;
    const oldest = await db.messages
      .where('conversationId')
      .equals(conversationId)
      .limit(excess)
      .keys();

    await db.messages.bulkDelete(oldest as string[]);
  }
}
