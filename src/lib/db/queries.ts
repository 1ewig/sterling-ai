'use client';

import { useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  listConversations,
} from './conversations';
import {
  getConversationMessages,
  getConversationMessageCount,
} from './messages';
import {
  type ConversationRecord,
  type ChatMessageRecord,
  DEFAULT_CONVERSATION_ID,
  db,
} from './schema';

/**
 * In-memory message cache to eliminate flash of empty state when switching conversations.
 */
const messagesCache = new Map<string, ChatMessageRecord[]>();

/**
 * Pre-populates the in-memory cache for all conversations to guarantee instant 0ms switching.
 */
export async function prewarmMessagesCache(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const allMessages = await db.messages.orderBy('timestamp').toArray();
    const grouped = new Map<string, ChatMessageRecord[]>();
    for (const msg of allMessages) {
      const convId = msg.conversationId || DEFAULT_CONVERSATION_ID;
      const list = grouped.get(convId) || [];
      list.push(msg);
      grouped.set(convId, list);
    }
    for (const [convId, msgs] of grouped.entries()) {
      messagesCache.set(convId, msgs);
    }
  } catch {
    // Gracefully handle any DB read issues during pre-warm
  }
}

/**
 * Synchronously update the memory cache on message mutation
 */
export function updateCachedMessage(message: ChatMessageRecord): void {
  const convId = message.conversationId || DEFAULT_CONVERSATION_ID;
  const list = messagesCache.get(convId) || [];
  const updated = [...list.filter((m) => m.id !== message.id), message];
  messagesCache.set(convId, updated);
}

/**
 * Clear cached messages for a specific conversation or entirely.
 */
export function clearMessagesCache(conversationId?: string): void {
  if (conversationId) {
    messagesCache.delete(conversationId);
  } else {
    messagesCache.clear();
  }
}

/**
 * Reactive query hook subscribing to the sorted list of conversations in Dexie IndexedDB.
 */
export function useConversations(): ConversationRecord[] {
  useEffect(() => {
    void prewarmMessagesCache();
  }, []);

  const live = useLiveQuery(() => listConversations(), []);
  return useMemo(() => live ?? [], [live]);
}

const EMPTY_MESSAGES: ChatMessageRecord[] = [];

export interface UseMessagesResult {
  messages: ChatMessageRecord[];
  isMessagesLoading: boolean;
}

/**
 * Reactive query hook subscribing to chronological messages for a specific conversation.
 * Employs an in-memory cache to provide instant, jitter-free conversation switching.
 */
export function useMessages(conversationId: string): UseMessagesResult {
  const cached = conversationId ? messagesCache.get(conversationId) : undefined;

  const live = useLiveQuery(
    async () => {
      if (!conversationId) return [];
      const msgs = await getConversationMessages(conversationId);
      messagesCache.set(conversationId, msgs);
      return msgs;
    },
    [conversationId],
    cached
  );

  const resolvedMessages = live ?? cached ?? EMPTY_MESSAGES;
  const isMessagesLoading = live === undefined && cached === undefined;

  return useMemo(
    () => ({
      messages: resolvedMessages,
      isMessagesLoading,
    }),
    [resolvedMessages, isMessagesLoading]
  );
}

/**
 * Reactive query hook subscribing to the message count for a specific conversation.
 */
export function useConversationMessageCount(conversationId: string): number {
  const live = useLiveQuery(
    () => getConversationMessageCount(conversationId),
    [conversationId],
    0
  );
  return live ?? 0;
}
