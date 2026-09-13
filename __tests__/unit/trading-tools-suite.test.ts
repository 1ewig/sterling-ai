import { describe, test, expect } from 'bun:test';
import {
  getOpenOrdersParamsSchema,
  cancelOrderParamsSchema,
  closePositionParamsSchema,
} from '@/agent/tools/order-management';
import { stageTradeOrderParamsSchema, accountOverviewParamsSchema } from '@/lib/bitget/types';
import { agentTools, getAgentTools } from '@/agent/tools';

describe('5-Tool Trading Suite & Schema Validation', () => {
  test('agentTools registry exposes all 5 dedicated trading tools', () => {
    const tools = getAgentTools();
    expect(agentTools).toBeDefined();
    expect(tools.get_account_overview).toBeDefined();
    expect(tools.stage_trade_order).toBeDefined();
    expect(tools.get_open_orders).toBeDefined();
    expect(tools.cancel_order).toBeDefined();
    expect(tools.close_position).toBeDefined();

    // Total 12 tools (7 market/macro + 5 execution)
    expect(Object.keys(tools).length).toBe(12);
    expect(Object.keys(agentTools).length).toBe(12);
  });

  test('getOpenOrdersParamsSchema parses optional symbol and defaults category', () => {
    const parsedDefault = getOpenOrdersParamsSchema.parse({});
    expect(parsedDefault.category).toBe('usdt-futures');
    expect(parsedDefault.symbol).toBeUndefined();

    const parsedSymbol = getOpenOrdersParamsSchema.parse({
      symbol: 'BTCUSDT',
      category: 'spot',
    });
    expect(parsedSymbol.symbol).toBe('BTCUSDT');
    expect(parsedSymbol.category).toBe('spot');
  });

  test('cancelOrderParamsSchema validates cancellation targets', () => {
    const parsedSingle = cancelOrderParamsSchema.parse({
      symbol: 'ETHUSDT',
      orderId: 'order_12345',
    });
    expect(parsedSingle.symbol).toBe('ETHUSDT');
    expect(parsedSingle.orderId).toBe('order_12345');
    expect(parsedSingle.cancelAll).toBe(false);

    const parsedBatch = cancelOrderParamsSchema.parse({
      symbol: 'SOLUSDT',
      cancelAll: true,
    });
    expect(parsedBatch.cancelAll).toBe(true);
  });

  test('closePositionParamsSchema validates percent and posSide', () => {
    const parsed = closePositionParamsSchema.parse({
      symbol: 'BTCUSDT',
      posSide: 'long',
      sizePercent: 50,
      rationale: 'Take partial profit into resistance',
    });

    expect(parsed.symbol).toBe('BTCUSDT');
    expect(parsed.posSide).toBe('long');
    expect(parsed.sizePercent).toBe(50);
    expect(parsed.rationale).toBe('Take partial profit into resistance');
  });

  test('stageTradeOrderParamsSchema validates precision and leverages', () => {
    const parsed = stageTradeOrderParamsSchema.parse({
      symbol: 'BTCUSDT',
      category: 'usdt-futures',
      side: 'buy',
      orderType: 'limit',
      size: 0.05,
      price: 65420.5,
      leverage: 20,
      stopLossPrice: 63000,
      takeProfitPrice: 72000,
    });

    expect(parsed.symbol).toBe('BTCUSDT');
    expect(parsed.size).toBe(0.05);
    expect(parsed.price).toBe(65420.5);
    expect(parsed.leverage).toBe(20);
  });

  test('accountOverviewParamsSchema defaults category to all', () => {
    const parsed = accountOverviewParamsSchema.parse({});
    expect(parsed.category).toBe('all');
  });
});
