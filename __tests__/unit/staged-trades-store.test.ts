import { describe, it, expect, beforeEach } from 'bun:test';
import { useStagedTradesStore } from '@/stores/staged-trades-store';

describe('Staged Trades Store & Modal Drawer Lifecycle Suite', () => {
  beforeEach(() => {
    useStagedTradesStore.setState({
      stagedTrades: [],
      activePopupId: null,
    });
  });

  it('stages a trade and sets activePopupId by default', () => {
    const store = useStagedTradesStore.getState();
    store.stageTrade({
      id: 'ticket-btc-101',
      ticketToken: 'hmac-token-101',
      symbol: 'BTCUSDT',
      category: 'USDT-FUTURES',
      side: 'buy',
      orderType: 'limit',
      size: 0.05,
      price: 65000,
      leverage: 5,
    });

    const updated = useStagedTradesStore.getState();
    expect(updated.stagedTrades.length).toBe(1);
    expect(updated.stagedTrades[0].symbol).toBe('BTCUSDT');
    expect(updated.stagedTrades[0].status).toBe('staged');
    expect(updated.activePopupId).toBe('ticket-btc-101');
  });

  it('deduplicates existing ticket IDs without duplicating in array', () => {
    const store = useStagedTradesStore.getState();
    store.stageTrade({
      id: 'ticket-sol-202',
      ticketToken: 'hmac-token-202',
      symbol: 'SOLUSDT',
      category: 'USDT-FUTURES',
      side: 'sell',
      orderType: 'market',
      size: 10,
    });

    // Attempt to stage identical ticket ID
    store.stageTrade({
      id: 'ticket-sol-202',
      ticketToken: 'hmac-token-202',
      symbol: 'SOLUSDT',
      category: 'USDT-FUTURES',
      side: 'sell',
      orderType: 'market',
      size: 10,
    });

    const updated = useStagedTradesStore.getState();
    expect(updated.stagedTrades.length).toBe(1);
    expect(updated.activePopupId).toBe('ticket-sol-202');
  });

  it('minimizes active trade to header by closing popup', () => {
    const store = useStagedTradesStore.getState();
    store.stageTrade({
      id: 'ticket-eth-303',
      ticketToken: 'hmac-token-303',
      symbol: 'ETHUSDT',
      category: 'USDT-FUTURES',
      side: 'buy',
      orderType: 'limit',
      size: 1.5,
    });

    expect(useStagedTradesStore.getState().activePopupId).toBe('ticket-eth-303');

    // User clicks minimize
    store.closePopup();

    const updated = useStagedTradesStore.getState();
    expect(updated.activePopupId).toBeNull();
    // Trade remains safely parked in the staged drawer
    expect(updated.stagedTrades.length).toBe(1);
    expect(updated.stagedTrades[0].id).toBe('ticket-eth-303');

    // Re-opening restores active popup
    store.openPopup('ticket-eth-303');
    expect(useStagedTradesStore.getState().activePopupId).toBe('ticket-eth-303');
  });

  it('discards a trade from the drawer and closes popup if active', () => {
    const store = useStagedTradesStore.getState();
    store.stageTrade({
      id: 'ticket-doge-404',
      ticketToken: 'hmac-token-404',
      symbol: 'DOGEUSDT',
      category: 'SPOT',
      side: 'buy',
      orderType: 'market',
      size: 1000,
    });

    expect(useStagedTradesStore.getState().activePopupId).toBe('ticket-doge-404');

    store.discardTrade('ticket-doge-404');

    const updated = useStagedTradesStore.getState();
    expect(updated.stagedTrades.length).toBe(0);
    expect(updated.activePopupId).toBeNull();
  });

  it('updates trade status on execution and purges expired tickets', () => {
    const store = useStagedTradesStore.getState();
    const pastTime = Date.now() - 10000;

    store.stageTrade({
      id: 'ticket-expired-505',
      ticketToken: 'hmac-token-505',
      symbol: 'XRPUSDT',
      category: 'USDT-FUTURES',
      side: 'buy',
      orderType: 'limit',
      size: 50,
      createdAt: pastTime - 300000,
      expiresAt: pastTime,
    });

    store.stageTrade({
      id: 'ticket-valid-606',
      ticketToken: 'hmac-token-606',
      symbol: 'AVAXUSDT',
      category: 'USDT-FUTURES',
      side: 'buy',
      orderType: 'limit',
      size: 5,
    });

    expect(useStagedTradesStore.getState().stagedTrades.length).toBe(2);

    // Update valid trade to executed
    store.updateTradeStatus('ticket-valid-606', {
      status: 'executed',
      orderId: 'bitget-ord-998877',
    });

    expect(useStagedTradesStore.getState().stagedTrades.find((t) => t.id === 'ticket-valid-606')?.status).toBe('executed');

    // Run clear expired
    store.clearExpired();

    const afterClear = useStagedTradesStore.getState();
    // ticket-expired-505 should be purged, ticket-valid-606 is executed so preserved
    expect(afterClear.stagedTrades.length).toBe(1);
    expect(afterClear.stagedTrades[0].id).toBe('ticket-valid-606');
  });
});
