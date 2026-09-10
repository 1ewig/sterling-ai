import {
  DEFAULT_CONVERSATION_ID,
  DEFAULT_CONVERSATION_TITLE,
  type ConversationRecord,
  db,
} from './schema';

/**
 * Ensures the default conversation exists
 */
export async function ensureDefaultConversation(): Promise<ConversationRecord> {
  if (typeof window === 'undefined') {
    return {
      id: DEFAULT_CONVERSATION_ID,
      title: DEFAULT_CONVERSATION_TITLE,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  const existing = await db.conversations.get(DEFAULT_CONVERSATION_ID);
  if (existing) {
    return existing;
  }

  const defaultConv: ConversationRecord = {
    id: DEFAULT_CONVERSATION_ID,
    title: DEFAULT_CONVERSATION_TITLE,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.conversations.put(defaultConv);
  return defaultConv;
}

/**
 * Creates a new conversation session
 */
export async function createConversation(
  title?: string
): Promise<ConversationRecord> {
  const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();
  const conv: ConversationRecord = {
    id,
    title: title || DEFAULT_CONVERSATION_TITLE,
    createdAt: now,
    updatedAt: now,
  };

  if (typeof window !== 'undefined') {
    await db.conversations.put(conv);
  }

  return conv;
}

/**
 * Lists all conversations ordered by most recently updated first
 */
export async function listConversations(): Promise<ConversationRecord[]> {
  if (typeof window === 'undefined') return [];
  const records = await db.conversations.toArray();
  return records.sort(
    (a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
  );
}

/**
 * Retrieves a single conversation by its ID
 */
export async function getConversation(conversationId: string): Promise<ConversationRecord | undefined> {
  if (typeof window === 'undefined') return undefined;
  return db.conversations.get(conversationId);
}

/**
 * Renames an existing conversation session
 */
export async function renameConversation(conversationId: string, newTitle: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const trimmed = newTitle.trim();
  if (!trimmed) return;
  await db.conversations.update(conversationId, {
    title: trimmed,
    updatedAt: Date.now(),
  });
}

/**
 * Deletes a conversation and all its messages
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  await db.messages.where('conversationId').equals(conversationId).delete();
  await db.conversations.delete(conversationId);
}
