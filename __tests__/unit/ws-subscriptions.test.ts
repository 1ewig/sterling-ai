import { describe, test, expect } from 'bun:test';
import { buildWsSubscriptions } from '@/lib/bitget/ws-subscriptions';

describe('WebSocket Subscription Builder & Channel Topology Suite', () => {
  test('builds accurate topics for standard spot & perpetual crypto pairs in V3 format', () => {
    const subs = buildWsSubscriptions('BTCUSDT', 'BTCUSDT', 'BTCUSDT');

    const spotTopics = subs.filter((s) => s.instType === 'spot').map((s) => s.topic);
    const futTopics = subs.filter((s) => s.instType === 'usdt-futures').map((s) => s.topic);

    expect(spotTopics).toContain('ticker');
    expect(spotTopics).toContain('books');
    expect(spotTopics).toContain('candle1m');

    expect(futTopics).toContain('ticker');
    expect(futTopics).toContain('books');
    expect(futTopics).toContain('candle1m');

    // Total 6 topics (3 spot + 3 futures)
    expect(subs.length).toBe(6);
  });

  test('routes tokenized rTokens with dual spot and futures multiplexing in V3 format', () => {
    const subs = buildWsSubscriptions('RTSLAUSDT', 'RTSLAUSDT', 'TSLAUSDT');

    const rTokenSpotBook = subs.find(
      (s) => s.instType === 'spot' && (s.symbol === 'RTSLAUSDT' || s.instId === 'RTSLAUSDT') && s.topic === 'books'
    );
    expect(rTokenSpotBook?.topic).toBe('books');

    const tslaFutBook = subs.find(
      (s) => s.instType === 'usdt-futures' && (s.symbol === 'TSLAUSDT' || s.instId === 'TSLAUSDT') && s.topic === 'books'
    );
    expect(tslaFutBook?.topic).toBe('books');
  });

  test('prevents phantom subscriptions: standard crypto pair never generates R-prefixed channel', () => {
    const subs = buildWsSubscriptions('BTCUSDT', 'BTCUSDT', 'BTCUSDT');
    const hasPhantomSpot = subs.some((s) => s.symbol === 'RBTCUSDT' || s.instId === 'RBTCUSDT');
    const hasPhantomFut = subs.some((s) => s.symbol === 'TCUSDT' || s.instId === 'TCUSDT');

    expect(hasPhantomSpot).toBe(false);
    expect(hasPhantomFut).toBe(false);
  });

  test('deduplicates subscription topics when cleanSymbol equals target IDs', () => {
    const subs = buildWsSubscriptions('ETHUSDT', 'ETHUSDT', 'ETHUSDT');
    const uniqueKeys = new Set(subs.map((s) => `${s.instType}:${s.topic || s.channel}:${s.symbol || s.instId}`));
    expect(subs.length).toBe(uniqueKeys.size);
  });
});

