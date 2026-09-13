import { db } from './schema';
import type { StagedActionRecord, StagedActionStatus } from './schema';

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes standard HMAC TTL

/**
 * Extracts authoritative expiresAt timestamp directly from an HMAC token (payload.expiresAt.sig).
 * Fallback to fallbackCreatedAt + ttlMs if token format cannot be parsed.
 */
export function extractExpiresAtFromToken(
  token?: string,
  fallbackCreatedAt?: number,
  ttlMs = DEFAULT_TTL_MS
): number {
  const baseTime = fallbackCreatedAt ?? Date.now();
  if (!token || typeof token !== 'string') {
    return baseTime + ttlMs;
  }

  const parts = token.split('.');
  if (parts.length === 3) {
    const expiresAt = parseInt(parts[1], 10);
    if (!Number.isNaN(expiresAt) && expiresAt > 0) {
      return expiresAt;
    }
  }

  return baseTime + ttlMs;
}

/**
 * Saves or updates a staged action in Dexie IndexedDB.
 * Guarantees that existing items retain their original createdAt and server-authoritative expiresAt.
 */
export async function saveStagedAction(
  actionData: Omit<StagedActionRecord, 'createdAt' | 'expiresAt' | 'status'> & {
    createdAt?: number;
    expiresAt?: number;
    status?: StagedActionStatus;
  }
): Promise<StagedActionRecord> {
  const existing = await db.staged_actions.get(actionData.id);
  const now = Date.now();

  const token = actionData.ticketToken || actionData.actionToken;
  const derivedExpiresAt =
    actionData.expiresAt ??
    (existing ? existing.expiresAt : extractExpiresAtFromToken(token, actionData.createdAt ?? now));

  const createdAt = existing ? existing.createdAt : actionData.createdAt ?? now;
  const status: StagedActionStatus =
    actionData.status ??
    (existing
      ? existing.status
      : derivedExpiresAt <= now
        ? 'expired'
        : 'staged');

  const record: StagedActionRecord = {
    ...existing,
    ...actionData,
    createdAt,
    expiresAt: derivedExpiresAt,
    status,
  };

  await db.staged_actions.put(record);
  return record;
}

/**
 * Retrieves a single staged action by ID.
 */
export async function getStagedAction(id: string): Promise<StagedActionRecord | undefined> {
  return await db.staged_actions.get(id);
}

/**
 * Updates status or partial fields of an existing staged action.
 */
export async function updateStagedActionStatus(
  id: string,
  update: Partial<StagedActionRecord>
): Promise<void> {
  const existing = await db.staged_actions.get(id);
  if (!existing) return;

  await db.staged_actions.update(id, {
    ...update,
    executedAt: update.status === 'executed' ? (update.executedAt ?? Date.now()) : existing.executedAt,
  });
}

/**
 * Discards a staged action by removing it from the active table.
 */
export async function discardStagedAction(id: string): Promise<void> {
  await db.staged_actions.delete(id);
}

/**
 * Marks expired actions or cleans up expired entries.
 */
export async function markExpiredStagedActions(): Promise<void> {
  const now = Date.now();
  const pendingActions = await db.staged_actions
    .where('status')
    .equals('staged')
    .toArray();

  const expiredIds = pendingActions
    .filter((a) => a.expiresAt <= now)
    .map((a) => a.id);

  if (expiredIds.length > 0) {
    await db.staged_actions
      .where('id')
      .anyOf(expiredIds)
      .modify({ status: 'expired' });
  }
}

/**
 * Gets all active pending actions for the trading desk.
 */
export async function getAllActiveStagedActions(): Promise<StagedActionRecord[]> {
  const now = Date.now();
  return await db.staged_actions
    .filter(
      (a) =>
        (a.status === 'staged' || a.status === 'executing') &&
        a.expiresAt > now
    )
    .reverse()
    .sortBy('createdAt');
}
