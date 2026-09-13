import { describe, test, expect } from 'bun:test';
import {
  snapPriceToTick,
  snapQtyToStep,
  validateOrderConstraints,
  getTierMmr,
  getInstrument,
  type BitgetInstrument,
} from '@/lib/bitget/trade/instruments';

describe('Instruments Precision & Constraints Rules Engine Suite', () => {
  test('snapPriceToTick accurately rounds prices to instrument tick decimal places', () => {
    const mockInstrument1: BitgetInstrument = {
      symbol: 'BTCUSDT',
      category: 'USDT-FUTURES',
      baseCoin: 'BTC',
      quoteCoin: 'USDT',
      minTradeNum: '0.001',
      pricePlace: '1',
      volumePlace: '3',
      status: 'online',
    };
    expect(snapPriceToTick(65123.456, mockInstrument1)).toBe(65123.5);

    const mockInstrument2: BitgetInstrument = {
      symbol: 'ETHUSDT',
      category: 'USDT-FUTURES',
      baseCoin: 'ETH',
      quoteCoin: 'USDT',
      minTradeNum: '0.01',
      pricePlace: '2',
      volumePlace: '2',
      status: 'online',
    };
    expect(snapPriceToTick(2456.789, mockInstrument2)).toBe(2456.79);
  });

  test('snapQtyToStep truncates quantity to step size and handles spot market buy quote currency', () => {
    const mockInstrument: BitgetInstrument = {
      symbol: 'BTCUSDT',
      category: 'USDT-FUTURES',
      baseCoin: 'BTC',
      quoteCoin: 'USDT',
      minTradeNum: '0.001',
      pricePlace: '1',
      volumePlace: '3',
      status: 'online',
    };
    expect(snapQtyToStep(0.123456, mockInstrument, false)).toBe(0.123);

    // Spot market buy uses quote coin (USDT) snapped to 2 decimals
    const spotMock: BitgetInstrument = {
      symbol: 'RTSLAUSDT',
      category: 'SPOT',
      baseCoin: 'RTSLA',
      quoteCoin: 'USDT',
      minTradeNum: '0.01',
      pricePlace: '2',
      volumePlace: '2',
      status: 'online',
    };
    expect(snapQtyToStep(150.4567, spotMock, true)).toBe(150.45);
  });

  test('validateOrderConstraints enforces minimum quantity, notional, and leverage boundaries', () => {
    const btc: BitgetInstrument = {
      symbol: 'BTCUSDT',
      category: 'USDT-FUTURES',
      baseCoin: 'BTC',
      quoteCoin: 'USDT',
      minTradeNum: '0.001',
      pricePlace: '1',
      volumePlace: '3',
      minTradeUSDT: '5',
      maxMarketOrderQty: '50',
      maxLeverage: '125',
      status: 'online',
    };

    // Below min quantity
    const tooSmallQty = validateOrderConstraints(
      { symbol: 'BTCUSDT', orderType: 'limit', size: 0.0001, price: 65000 },
      btc
    );
    expect(tooSmallQty.valid).toBe(false);
    expect(tooSmallQty.error).toContain('below the minimum allowed quantity');

    // Below min notional ($5) with sufficient quantity
    const tooSmallNotional = validateOrderConstraints(
      { symbol: 'BTCUSDT', orderType: 'limit', size: 0.001, price: 1000 }, // $1 notional < $5
      btc
    );
    expect(tooSmallNotional.valid).toBe(false);
    expect(tooSmallNotional.error).toContain('minimum required notional');

    // Exceeds max leverage
    const tooHighLev = validateOrderConstraints(
      { symbol: 'BTCUSDT', orderType: 'limit', size: 0.1, price: 65000, leverage: 150 },
      btc
    );
    expect(tooHighLev.valid).toBe(false);
    expect(tooHighLev.error).toContain('exceeds maximum allowed leverage');

    // Valid setup
    const valid = validateOrderConstraints(
      { symbol: 'BTCUSDT', orderType: 'limit', size: 0.01, price: 65000, leverage: 10 },
      btc
    );
    expect(valid.valid).toBe(true);
  });

  test('getTierMmr computes progressive maintenance margin rates based on notional size', () => {
    // BTC base bracket: 0.4% up to 50k, 0.5% up to 250k, 1.0% up to 1M, 2.0% above
    expect(getTierMmr('BTCUSDT', 25000)).toBe(0.004);
    expect(getTierMmr('BTCUSDT', 150000)).toBe(0.005);
    expect(getTierMmr('BTCUSDT', 500000)).toBe(0.01);
    expect(getTierMmr('BTCUSDT', 2000000)).toBe(0.02);

    // Altcoins / Equities
    expect(getTierMmr('SOLUSDT', 10000)).toBe(0.006);
    expect(getTierMmr('SOLUSDT', 80000)).toBe(0.01);
  });

  test('getInstrument resolves symbol metadata with fallbacks', async () => {
    const inst = await getInstrument('BTCUSDT', 'usdt-futures');
    expect(inst.symbol).toBe('BTCUSDT');
    expect(inst.category).toBe('USDT-FUTURES');
  });
});
