import { describe, test, expect } from 'bun:test';
import {
  buildPlaceOrderPayload,
  buildModifyPayload,
  buildCancelPayload,
  buildBatchCancelPayload,
  buildClosePositionsPayload,
} from '@/lib/bitget/trade/payloads';
import { toV3Category } from '@/lib/bitget/types';

describe('Bitget V3 Trade Payloads Unit Suite', () => {
  test('toV3Category normalizes aliases to uppercase V3 categories', () => {
    expect(toV3Category('spot')).toBe('SPOT');
    expect(toV3Category('usdt-futures')).toBe('USDT-FUTURES');
    expect(toV3Category('FUTURES')).toBe('USDT-FUTURES');
    expect(toV3Category('coin-futures')).toBe('COIN-FUTURES');
    expect(toV3Category('usdc-futures')).toBe('USDC-FUTURES');
    expect(toV3Category(undefined)).toBe('USDT-FUTURES');
  });

  test('buildPlaceOrderPayload constructs valid futures limit order with TP/SL', () => {
    const payload = buildPlaceOrderPayload({
      symbol: 'BTCUSDT',
      category: 'usdt-futures',
      side: 'buy',
      orderType: 'limit',
      size: '0.05',
      price: '64500.50',
      posSide: 'net',
      marginMode: 'crossed',
      clientOid: 'custom_client_oid_123',
      stopLoss: {
        triggerPrice: '62000',
        executePrice: '61950',
      },
      takeProfit: {
        triggerPrice: '70000',
      },
    });

    expect(payload.category).toBe('USDT-FUTURES');
    expect(payload.symbol).toBe('BTCUSDT');
    expect(payload.side).toBe('buy');
    expect(payload.orderType).toBe('limit');
    expect(payload.size).toBe('0.05');
    expect(payload.price).toBe('64500.50');
    expect(payload.posSide).toBe('net');
    expect(payload.reduceOnly).toBe(false);
    expect(payload.clientOid).toBe('custom_client_oid_123');
    expect(payload.stopLoss?.triggerPrice).toBe('62000');
    expect(payload.stopLoss?.executePrice).toBe('61950');
    expect(payload.takeProfit?.triggerPrice).toBe('70000');
  });

  test('buildPlaceOrderPayload handles spot market orders without margin fields', () => {
    const payload = buildPlaceOrderPayload({
      symbol: 'ETHUSDT',
      category: 'spot',
      side: 'buy',
      orderType: 'market',
      size: '100', // quote currency USDT for market buy on spot
    });

    expect(payload.category).toBe('SPOT');
    expect(payload.symbol).toBe('ETHUSDT');
    expect(payload.orderType).toBe('market');
    expect(payload.price).toBeUndefined();
    expect(payload.posSide).toBeUndefined();
    expect(payload.reduceOnly).toBeUndefined();
    expect(payload.marginMode).toBeUndefined();
  });

  test('buildModifyPayload formats order modification with autoCancel', () => {
    const payload = buildModifyPayload({
      symbol: 'SOLUSDT',
      category: 'usdt-futures',
      orderId: '12345678',
      newPrice: '145.20',
      newSize: '10',
      autoCancel: true,
    });

    expect(payload.category).toBe('USDT-FUTURES');
    expect(payload.symbol).toBe('SOLUSDT');
    expect(payload.orderId).toBe('12345678');
    expect(payload.newPrice).toBe('145.20');
    expect(payload.newSize).toBe('10');
    expect(payload.autoCancel).toBe(true);
  });

  test('buildCancelPayload formats single order cancellation', () => {
    const payload = buildCancelPayload({
      symbol: 'BTCUSDT',
      category: 'usdt-futures',
      orderId: 'order_987',
      clientOid: 'client_987',
    });

    expect(payload.category).toBe('USDT-FUTURES');
    expect(payload.symbol).toBe('BTCUSDT');
    expect(payload.orderId).toBe('order_987');
    expect(payload.clientOid).toBe('client_987');
  });

  test('buildBatchCancelPayload formats symbol batch cancellation', () => {
    const payload = buildBatchCancelPayload('RTSLAUSDT', 'spot');
    expect(payload.category).toBe('SPOT');
    expect(payload.symbol).toBe('RTSLAUSDT');
  });

  test('buildClosePositionsPayload sets market reduce-only order', () => {
    const payload = buildClosePositionsPayload('BTCUSDT', 'usdt-futures', 'sell', '0.05', 'net');
    expect(payload.category).toBe('USDT-FUTURES');
    expect(payload.symbol).toBe('BTCUSDT');
    expect(payload.side).toBe('sell');
    expect(payload.orderType).toBe('market');
    expect(payload.size).toBe('0.05');
    expect(payload.reduceOnly).toBe(true);
    expect(payload.posSide).toBe('net');
  });
});
