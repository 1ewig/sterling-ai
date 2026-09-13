import { describe, test, expect } from 'bun:test';
import {
  createTradeTicketToken,
  verifyTradeTicketToken,
  createActionTicketToken,
  verifyActionTicketToken,
  type StagedTradeTicketPayload,
  type StagedActionTicketPayload,
} from '@/lib/bitget/auth/ticket';

describe('Cryptographic Trade & Action Tickets Suite', () => {
  const mockPayload: StagedTradeTicketPayload = {
    ticketId: 'ticket_test_123',
    symbol: 'BTCUSDT',
    category: 'USDT-FUTURES',
    side: 'buy',
    orderType: 'limit',
    size: 0.05,
    price: 65000,
    tradeSide: 'open',
    leverage: 10,
    stopLossPrice: 63000,
    takeProfitPrice: 70000,
    clientOid: 'client_oid_123',
    timestamp: Date.now(),
  };

  test('createTradeTicketToken produces valid HMAC token and verifies successfully', () => {
    const token = createTradeTicketToken(mockPayload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const verification = verifyTradeTicketToken(token);
    expect(verification.valid).toBe(true);
    expect(verification.payload?.symbol).toBe('BTCUSDT');
    expect(verification.payload?.size).toBe(0.05);
    expect(verification.payload?.price).toBe(65000);
    expect(verification.payload?.leverage).toBe(10);
  });

  test('verifyTradeTicketToken detects tampering with payload', () => {
    const token = createTradeTicketToken(mockPayload);
    const [encodedPayload, expiresAt, sig] = token.split('.');

    // Tamper with payload (e.g. increase order size)
    const decoded = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
    decoded.size = 5.0; // 100x size injection attempt
    const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString('base64url');

    const tamperedToken = `${tamperedPayload}.${expiresAt}.${sig}`;
    const result = verifyTradeTicketToken(tamperedToken);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Cryptographic signature verification failed');
  });

  test('verifyTradeTicketToken detects expired tokens', () => {
    const pastExpiration = Date.now() - 1000; // already expired
    const encodedPayload = Buffer.from(JSON.stringify(mockPayload)).toString('base64url');
    const expiredToken = `${encodedPayload}.${pastExpiration}.fakesig`;

    const result = verifyTradeTicketToken(expiredToken);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('expired');
  });

  test('createActionTicketToken handles cancel and close actions', () => {
    const actionPayload: StagedActionTicketPayload = {
      actionId: 'action_123',
      action: 'cancel_order',
      symbol: 'SOLUSDT',
      category: 'USDT-FUTURES',
      orderId: 'order_999',
      timestamp: Date.now(),
    };

    const token = createActionTicketToken(actionPayload);
    const res = verifyActionTicketToken(token);

    expect(res.valid).toBe(true);
    expect(res.payload?.action).toBe('cancel_order');
    expect(res.payload?.symbol).toBe('SOLUSDT');
    expect(res.payload?.orderId).toBe('order_999');
  });
});
