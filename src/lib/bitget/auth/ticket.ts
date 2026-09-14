import crypto from 'node:crypto';
import type { StagedTradeTicketPayload, StagedActionTicketPayload } from '../types';

export type { StagedTradeTicketPayload, StagedActionTicketPayload };

const TICKET_TTL_MS = 5 * 60 * 1000; // 5 minutes validity

function getTicketSecret(): string {
  return (
    process.env.TRADE_TICKET_SECRET ||
    process.env.BITGET_API_SECRET ||
    'sterling_desk_internal_signing_key_2026'
  );
}

/**
 * Creates a tamper-proof cryptographically signed HMAC token for staged trade orders
 * Format: base64url(payload).expiresAt.signature
 */
export function createTradeTicketToken(payload: StagedTradeTicketPayload): string {
  const expiresAt = Date.now() + TICKET_TTL_MS;
  const payloadStr = JSON.stringify(payload);
  const encodedPayload = Buffer.from(payloadStr).toString('base64url');

  const secret = getTicketSecret();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedPayload}.${expiresAt}`)
    .digest('base64url');

  return `${encodedPayload}.${expiresAt}.${signature}`;
}

/**
 * Verifies and decodes a signed trade ticket token
 */
export function verifyTradeTicketToken(token: string): {
  valid: boolean;
  error?: string;
  payload?: StagedTradeTicketPayload;
} {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed trade ticket token format.' };
  }

  const [encodedPayload, expiresAtStr, signature] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);

  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
    return { valid: false, error: 'Trade ticket has expired (5-minute TTL exceeded). Please re-stage the trade.' };
  }

  const secret = getTicketSecret();
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${encodedPayload}.${expiresAt}`)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return { valid: false, error: 'Cryptographic signature verification failed. Ticket parameters have been tampered with.' };
  }

  try {
    const jsonStr = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const payload = JSON.parse(jsonStr) as StagedTradeTicketPayload;
    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Failed to decode trade ticket payload.' };
  }
}

/**
 * Creates an HMAC token for destructive actions (cancel order, close position)
 */
export function createActionTicketToken(payload: StagedActionTicketPayload): string {
  const expiresAt = Date.now() + TICKET_TTL_MS;
  const payloadStr = JSON.stringify(payload);
  const encodedPayload = Buffer.from(payloadStr).toString('base64url');

  const secret = getTicketSecret();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`ACTION:${encodedPayload}.${expiresAt}`)
    .digest('base64url');

  return `${encodedPayload}.${expiresAt}.${signature}`;
}

/**
 * Verifies an action ticket token
 */
export function verifyActionTicketToken(token: string): {
  valid: boolean;
  error?: string;
  payload?: StagedActionTicketPayload;
} {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed action ticket token format.' };
  }

  const [encodedPayload, expiresAtStr, signature] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);

  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
    return { valid: false, error: 'Action ticket has expired. Please re-stage the action.' };
  }

  const secret = getTicketSecret();
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`ACTION:${encodedPayload}.${expiresAt}`)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return { valid: false, error: 'Action ticket signature invalid.' };
  }

  try {
    const jsonStr = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const payload = JSON.parse(jsonStr) as StagedActionTicketPayload;
    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Failed to decode action ticket payload.' };
  }
}
