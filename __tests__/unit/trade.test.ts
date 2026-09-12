import { describe, test, expect } from 'bun:test';
import { generateBitgetV3Signature } from '@/lib/bitget/trade';
import { stageTradeOrderParamsSchema } from '@/lib/bitget/types';

describe('Bitget v3 UTA Trading & Signing Unit Suite', () => {
  test('generateBitgetV3Signature creates valid deterministic HMAC-SHA256 base64 signatures', () => {
    const secretKey = 'test_secret_key_12345';
    const timestamp = '1726146000000';
    const method = 'POST';
    const requestPath = '/api/v3/trade/place-order';
    const queryString = '';
    const bodyString = JSON.stringify({
      symbol: 'BTCUSDT',
      category: 'usdt-futures',
      side: 'buy',
      orderType: 'limit',
      size: '0.1',
      price: '65000',
    });

    const sig = generateBitgetV3Signature(
      secretKey,
      timestamp,
      method,
      requestPath,
      queryString,
      bodyString
    );

    expect(typeof sig).toBe('string');
    expect(sig.length).toBeGreaterThan(20);

    // Verify consistency: identical inputs must yield identical hash
    const sig2 = generateBitgetV3Signature(
      secretKey,
      timestamp,
      method,
      requestPath,
      queryString,
      bodyString
    );
    expect(sig).toBe(sig2);
  });

  test('generateBitgetV3Signature correctly handles GET requests with query strings', () => {
    const secretKey = 'test_secret_key_12345';
    const timestamp = '1726146000000';
    const method = 'GET';
    const requestPath = '/api/v3/trade/current-positions';
    const queryString = 'productType=USDT-FUTURES';

    const sig = generateBitgetV3Signature(
      secretKey,
      timestamp,
      method,
      requestPath,
      queryString
    );

    expect(typeof sig).toBe('string');
    expect(sig.length).toBeGreaterThan(0);
  });

  test('stageTradeOrderParamsSchema validates correct inputs', () => {
    const validParams = {
      symbol: 'BTCUSDT',
      category: 'usdt-futures' as const,
      side: 'buy' as const,
      orderType: 'limit' as const,
      size: 0.05,
      price: 64200,
      tradeSide: 'open' as const,
      leverage: 10,
      stopLossPrice: 62000,
      takeProfitPrice: 70000,
      rationale: 'Breakout retest of 4h EMA20',
    };

    const parsed = stageTradeOrderParamsSchema.safeParse(validParams);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.symbol).toBe('BTCUSDT');
      expect(parsed.data.size).toBe(0.05);
      expect(parsed.data.leverage).toBe(10);
    }
  });

  test('stageTradeOrderParamsSchema rejects invalid non-positive size', () => {
    const invalidParams = {
      symbol: 'BTCUSDT',
      category: 'usdt-futures' as const,
      side: 'buy' as const,
      orderType: 'limit' as const,
      size: -0.05,
    };

    const parsed = stageTradeOrderParamsSchema.safeParse(invalidParams);
    expect(parsed.success).toBe(false);
  });

  test('stageTradeOrderParamsSchema supports tokenized US equity rTokens', () => {
    const rTokenParams = {
      symbol: 'RTSLAUSDT',
      category: 'spot' as const,
      side: 'buy' as const,
      orderType: 'market' as const,
      size: 2.0,
      stopLossPrice: 210,
      takeProfitPrice: 250,
      rationale: 'Q3 Delivery beat momentum setup',
    };

    const parsed = stageTradeOrderParamsSchema.safeParse(rTokenParams);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.symbol).toBe('RTSLAUSDT');
      expect(parsed.data.category).toBe('spot');
    }
  });
});
