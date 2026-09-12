import { describe, test, expect } from 'bun:test';
import { buildWsSubscriptions } from '@/lib/bitget/ws-subscriptions';

describe('WebSocket Subscription Builder & Channel Topology Suite', () => {
  test('builds accurate topics for standard spot & perpetual crypto pairs', () => {
    const subs = buildWsSubscriptions('BTCUSDT', 'BTCUSDT', 'BTCUSDT');

    const spotChannels = subs.filter((s) => s.instType === 'SPOT').map((s) => s.channel);
    const futChannels = subs.filter((s) => s.instType === 'USDT-FUTURES').map((s) => s.channel);

    expect(spotChannels).toContain('ticker');
    expect(spotChannels).toContain('books15');
    expect(spotChannels).toContain('candle1m');

    expect(futChannels).toContain('ticker');
    expect(futChannels).toContain('books15');
    expect(futChannels).toContain('candle1m');

    // Total 6 topics (3 spot + 3 futures)
    expect(subs.length).toBe(6);
  });

  test('routes rTokens to full "books" depth while keeping standard pairs on "books15"', () => {
    const subs = buildWsSubscriptions('RTSLAUSDT', 'RTSLAUSDT', 'TSLAUSDT');

    const rTokenSpotBook = subs.find(
      (s) => s.instType === 'SPOT' && s.instId === 'RTSLAUSDT' && (s.channel === 'books' || s.channel === 'books15')
    );
    expect(rTokenSpotBook?.channel).toBe('books');

    const tslaFutBook = subs.find(
      (s) => s.instType === 'USDT-FUTURES' && s.instId === 'TSLAUSDT' && (s.channel === 'books' || s.channel === 'books15')
    );
    expect(tslaFutBook?.channel).toBe('books15');
  });

  test('prevents phantom subscriptions: standard crypto pair never generates R-prefixed channel', () => {
    const subs = buildWsSubscriptions('BTCUSDT', 'BTCUSDT', 'BTCUSDT');
    const hasPhantomSpot = subs.some((s) => s.instId === 'RBTCUSDT');
    const hasPhantomFut = subs.some((s) => s.instId === 'TCUSDT');

    expect(hasPhantomSpot).toBe(false);
    expect(hasPhantomFut).toBe(false);
  });

  test('deduplicates subscription topics when cleanSymbol equals target IDs', () => {
    const subs = buildWsSubscriptions('ETHUSDT', 'ETHUSDT', 'ETHUSDT');
    const uniqueKeys = new Set(subs.map((s) => `${s.instType}:${s.channel}:${s.instId}`));
    expect(subs.length).toBe(uniqueKeys.size);
  });
});
