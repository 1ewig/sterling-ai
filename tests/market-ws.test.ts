import { describe, test, expect } from 'bun:test';
import { normalizeSymbol } from '../src/lib/bitget/client';
import type { BitgetWsMessage, BitgetWsTickerData, BitgetWsBookData } from '../src/lib/bitget/types';

const WS_URL = 'wss://ws.bitget.com/v2/ws/public';

describe('Bitget Market WebSocket Integration & Data Contracts', () => {
  test('normalizeSymbol correctly cleans input assets', () => {
    expect(normalizeSymbol('btc')).toBe('BTCUSDT');
    expect(normalizeSymbol('ETHUSDT')).toBe('ETHUSDT');
    expect(normalizeSymbol('sol ')).toBe('SOLUSDT');
    expect(normalizeSymbol('TSLAUSDT')).toBe('TSLAUSDT');
    expect(normalizeSymbol('NVDA')).toBe('NVDAUSDT');
  });

  test('Public WebSocket connects, pings/pongs, and streams live SPOT ticker data', async () => {
    const streamData = await new Promise<{
      subscribed: boolean;
      pongReceived: boolean;
      ticker: BitgetWsTickerData;
    }>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      let subscribed = false;
      let pongReceived = false;
      let tickerResult: BitgetWsTickerData | null = null;

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket test timed out after 6000ms'));
      }, 6000);

      ws.onopen = () => {
        // 1. Send Ping
        ws.send('ping');

        // 2. Subscribe to BTCUSDT SPOT ticker
        ws.send(
          JSON.stringify({
            op: 'subscribe',
            args: [
              {
                instType: 'SPOT',
                channel: 'ticker',
                instId: 'BTCUSDT',
              },
            ],
          })
        );
      };

      ws.onmessage = (event) => {
        const raw = event.data?.toString() || '';
        if (raw === 'pong') {
          pongReceived = true;
          return;
        }

        try {
          const parsed = JSON.parse(raw) as BitgetWsMessage<BitgetWsTickerData>;
          if (parsed.event === 'subscribe') {
            subscribed = true;
          }

          if (parsed.data && parsed.data.length > 0 && parsed.arg?.channel === 'ticker') {
            tickerResult = parsed.data[0];
            if (subscribed && pongReceived && tickerResult) {
              clearTimeout(timeout);
              ws.close();
              resolve({
                subscribed,
                pongReceived,
                ticker: tickerResult,
              });
            }
          }
        } catch {
          // Ignore non-json frames
        }
      };

      ws.onerror = (err) => {
        clearTimeout(timeout);
        ws.close();
        reject(err);
      };
    });

    expect(streamData.subscribed).toBe(true);
    expect(streamData.pongReceived).toBe(true);
    expect(streamData.ticker.instId).toBe('BTCUSDT');
    expect(parseFloat(streamData.ticker.lastPr)).toBeGreaterThan(0);
    expect(parseFloat(streamData.ticker.high24h)).toBeGreaterThan(0);
    expect(parseFloat(streamData.ticker.low24h)).toBeGreaterThan(0);
  });

  test('Public WebSocket streams live FUTURES ticker & funding rate data', async () => {
    const futuresData = await new Promise<BitgetWsTickerData>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Futures ticker test timed out after 6000ms'));
      }, 6000);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            op: 'subscribe',
            args: [
              {
                instType: 'USDT-FUTURES',
                channel: 'ticker',
                instId: 'BTCUSDT',
              },
            ],
          })
        );
      };

      ws.onmessage = (event) => {
        const raw = event.data?.toString() || '';
        if (raw === 'pong') return;

        try {
          const parsed = JSON.parse(raw) as BitgetWsMessage<BitgetWsTickerData>;
          if (parsed.data && parsed.data.length > 0 && parsed.arg?.channel === 'ticker') {
            clearTimeout(timeout);
            ws.close();
            resolve(parsed.data[0]);
          }
        } catch {
          // Ignore
        }
      };

      ws.onerror = (err) => {
        clearTimeout(timeout);
        ws.close();
        reject(err);
      };
    });

    expect(futuresData.instId).toBe('BTCUSDT');
    expect(parseFloat(futuresData.lastPr)).toBeGreaterThan(0);
    expect(futuresData.fundingRate).toBeDefined();
    expect(typeof futuresData.fundingRate).toBe('string');
  });

  test('Public WebSocket streams live Order Book Depth (L2 books)', async () => {
    const bookData = await new Promise<BitgetWsBookData>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Orderbook depth test timed out after 6000ms'));
      }, 6000);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            op: 'subscribe',
            args: [
              {
                instType: 'SPOT',
                channel: 'books',
                instId: 'BTCUSDT',
              },
            ],
          })
        );
      };

      ws.onmessage = (event) => {
        const raw = event.data?.toString() || '';
        if (raw === 'pong') return;

        try {
          const parsed = JSON.parse(raw) as BitgetWsMessage<BitgetWsBookData>;
          if (parsed.data && parsed.data.length > 0 && parsed.arg?.channel === 'books') {
            clearTimeout(timeout);
            ws.close();
            resolve(parsed.data[0]);
          }
        } catch {
          // Ignore
        }
      };

      ws.onerror = (err) => {
        clearTimeout(timeout);
        ws.close();
        reject(err);
      };
    });

    expect(bookData.asks).toBeDefined();
    expect(bookData.bids).toBeDefined();
    expect(bookData.asks.length).toBeGreaterThan(0);
    expect(bookData.bids.length).toBeGreaterThan(0);

    const [bestBidPrice, bestBidSize] = bookData.bids[0];
    const [bestAskPrice, bestAskSize] = bookData.asks[0];

    expect(parseFloat(bestBidPrice)).toBeGreaterThan(0);
    expect(parseFloat(bestBidSize)).toBeGreaterThan(0);
    expect(parseFloat(bestAskPrice)).toBeGreaterThan(0);
    expect(parseFloat(bestAskSize)).toBeGreaterThan(0);
  });
});
