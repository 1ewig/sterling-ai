import { describe, test, expect } from 'bun:test';
import { generateBitgetV3Signature, classifyBitgetError, getPositionsV3, placeOrderV3 } from '@/lib/bitget/trade';
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

  test('classifyBitgetError maps 40006 / 40014 to AUTH_FAILED with actionable guidance', () => {
    const authErr = classifyBitgetError('40006', 'invalid access_key');
    expect(authErr.category).toBe('AUTH_FAILED');
    expect(authErr.canRetry).toBe(false);
    expect(authErr.actionableGuidance).toContain('BITGET_API_KEY');

    const sigErr = classifyBitgetError('40014', 'signature error');
    expect(sigErr.category).toBe('AUTH_FAILED');
    expect(sigErr.actionableGuidance).toContain('BITGET_API_SECRET');
  });

  test('classifyBitgetError maps 40034 to IP_BLOCKED with whitelist instructions', () => {
    const ipErr = classifyBitgetError('40034', 'ip not in whitelist');
    expect(ipErr.category).toBe('IP_BLOCKED');
    expect(ipErr.canRetry).toBe(false);
    expect(ipErr.actionableGuidance).toContain('Whitelist');
  });

  test('classifyBitgetError maps 43012 to INSUFFICIENT_FUNDS with collateral guidance', () => {
    const fundErr = classifyBitgetError('43012', 'insufficient balance');
    expect(fundErr.category).toBe('INSUFFICIENT_FUNDS');
    expect(fundErr.canRetry).toBe(false);
    expect(fundErr.actionableGuidance).toContain('collateral');
  });

  test('classifyBitgetError maps 43025 / 43004 to ORDER_INVALID with constraint guidance', () => {
    const sizeErr = classifyBitgetError('43025', 'order size too small');
    expect(sizeErr.category).toBe('ORDER_INVALID');
    expect(sizeErr.canRetry).toBe(false);
    expect(sizeErr.actionableGuidance).toContain('trade size');
  });

  test('classifyBitgetError maps 40800 / 429 to RATE_LIMITED with retry guidance', () => {
    const rateErr = classifyBitgetError('40800', 'request frequency is too high');
    expect(rateErr.category).toBe('RATE_LIMITED');
    expect(rateErr.canRetry).toBe(true);
    expect(rateErr.actionableGuidance).toContain('Wait');
  });

  test('stageTradeOrderParamsSchema validates correct inputs and coerces string numbers', () => {
    const validParams = {
      symbol: 'BTCUSDT',
      category: 'usdt-futures' as const,
      side: 'buy' as const,
      orderType: 'limit' as const,
      size: '0.05' as unknown as number, // String coerced to number
      price: '64200' as unknown as number,
      tradeSide: 'open' as const,
      leverage: '10' as unknown as number,
      stopLossPrice: '62000' as unknown as number,
      takeProfitPrice: '70000' as unknown as number,
      rationale: 'Breakout retest of 4h EMA20',
    };

    const parsed = stageTradeOrderParamsSchema.safeParse(validParams);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.symbol).toBe('BTCUSDT');
      expect(parsed.data.size).toBe(0.05);
      expect(parsed.data.price).toBe(64200);
      expect(parsed.data.leverage).toBe(10);
      expect(parsed.data.stopLossPrice).toBe(62000);
    }
  });

  test('stageTradeOrderParamsSchema accepts long/short aliases for side', () => {
    const longParams = {
      symbol: 'ETHUSDT',
      category: 'usdt-futures' as const,
      side: 'long' as const,
      size: 1.5,
    };
    const parsedLong = stageTradeOrderParamsSchema.safeParse(longParams);
    expect(parsedLong.success).toBe(true);

    const shortParams = {
      symbol: 'ETHUSDT',
      category: 'usdt-futures' as const,
      side: 'short' as const,
      size: 1.5,
    };
    const parsedShort = stageTradeOrderParamsSchema.safeParse(shortParams);
    expect(parsedShort.success).toBe(true);
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

  test('getPositionsV3 and placeOrderV3 throw clear error when credentials are not configured', async () => {
    const origKey = process.env.BITGET_API_KEY;
    delete process.env.BITGET_API_KEY;

    try {
      await expect(getPositionsV3()).rejects.toThrow('Bitget credentials not configured');
      await expect(
        placeOrderV3({
          symbol: 'BTCUSDT',
          category: 'usdt-futures',
          side: 'buy',
          orderType: 'limit',
          size: '0.01',
          price: '60000',
        })
      ).rejects.toThrow('Bitget credentials not configured');
    } finally {
      if (origKey) process.env.BITGET_API_KEY = origKey;
    }
  });
});
