import { describe, test, expect } from 'bun:test';
import { normalizeSymbol } from '@/lib/bitget';
import type { BitgetWsMessage, BitgetWsTickerData, BitgetWsBookData } from '@/lib/bitget/types';

const WS_URL = 'wss://ws.bitget.com/v2/ws/public';

describe('Bitget Market WebSocket Integration & Data Contracts', () => {

  test('normalizeSymbol correctly cleans input assets', () => {
    expect(normalizeSymbol('btc')).toBe('BTCUSDT');
    expect(normalizeSymbol('ETHUSDT')).toBe('ETHUSDT');
    expect(normalizeSymbol('sol ')).toBe('SOLUSDT');
    expect(normalizeSymbol('TSLAUSDT')).toBe('TSLAUSDT');
    expect(normalizeSymbol('NVDA')).toBe('NVDAUSDT');
    expect(normalizeSymbol('GOLD')).toBe('XAUUSDT');
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
        reject(new Error('WebSocket SPOT ticker test timed out after 7000ms'));
      }, 7000);

      ws.onopen = () => {
        ws.send('ping');
        ws.send(
          JSON.stringify({
            op: 'subscribe',
            args: [{ instType: 'SPOT', channel: 'ticker', instId: 'BTCUSDT' }],
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
              resolve({ subscribed, pongReceived, ticker: tickerResult });
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
  }, 10000);

  test('Public WebSocket streams live FUTURES ticker & funding rate data', async () => {
    const futuresData = await new Promise<BitgetWsTickerData>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Futures ticker test timed out after 7000ms'));
      }, 7000);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            op: 'subscribe',
            args: [{ instType: 'USDT-FUTURES', channel: 'ticker', instId: 'BTCUSDT' }],
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
  }, 10000);

  test('Public WebSocket streams live Order Book Depth (L2 books)', async () => {
    const bookData = await new Promise<BitgetWsBookData>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Orderbook depth test timed out after 7000ms'));
      }, 7000);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            op: 'subscribe',
            args: [{ instType: 'SPOT', channel: 'books5', instId: 'BTCUSDT' }],
          })
        );
      };

      ws.onmessage = (event) => {
        const raw = event.data?.toString() || '';
        if (raw === 'pong') return;

        try {
          const parsed = JSON.parse(raw) as BitgetWsMessage<BitgetWsBookData>;
          if (parsed.data && parsed.data.length > 0 && (parsed.arg?.channel === 'books5' || parsed.arg?.channel === 'books')) {
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
  }, 10000);

  test('Public WebSocket streams live 1-minute OHLCV Candlesticks (candle1m)', async () => {
    const candleData = await new Promise<{
      instId: string;
      rawCandles: string[][];
    }>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Candlestick stream test timed out after 7000ms'));
      }, 7000);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            op: 'subscribe',
            args: [{ instType: 'SPOT', channel: 'candle1m', instId: 'BTCUSDT' }],
          })
        );
      };

      ws.onmessage = (event) => {
        const raw = event.data?.toString() || '';
        if (raw === 'pong') return;

        try {
          const parsed = JSON.parse(raw) as BitgetWsMessage<string[]>;
          if (parsed.data && parsed.data.length > 0 && parsed.arg?.channel === 'candle1m') {
            clearTimeout(timeout);
            ws.close();
            resolve({
              instId: parsed.arg.instId || parsed.arg.symbol || 'BTCUSDT',
              rawCandles: parsed.data as string[][],
            });

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

    expect(candleData.instId).toBe('BTCUSDT');
    expect(candleData.rawCandles.length).toBeGreaterThan(0);

    const firstCandle = candleData.rawCandles[0];
    // Bitget 1m candle array: [timestamp, open, high, low, close, volume, quoteVol]
    expect(firstCandle.length).toBeGreaterThanOrEqual(5);

    const timestamp = parseInt(firstCandle[0], 10);
    const open = parseFloat(firstCandle[1]);
    const high = parseFloat(firstCandle[2]);
    const low = parseFloat(firstCandle[3]);
    const close = parseFloat(firstCandle[4]);

    expect(timestamp).toBeGreaterThan(1700000000000); // Valid recent epoch ms
    expect(open).toBeGreaterThan(0);
    expect(high).toBeGreaterThanOrEqual(low);
    expect(close).toBeGreaterThan(0);
  }, 10000);

  test('Public WebSocket streams live USDT-FUTURES data for futures-only contract (RUNEUSDT)', async () => {
    const streamData = await new Promise<{
      ticker: BitgetWsTickerData;
      books: BitgetWsBookData;
    }>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      let tickerResult: BitgetWsTickerData | null = null;
      let bookResult: BitgetWsBookData | null = null;

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Futures-only contract WebSocket test timed out after 8000ms'));
      }, 8000);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            op: 'subscribe',
            args: [
              { instType: 'USDT-FUTURES', channel: 'ticker', instId: 'RUNEUSDT' },
              { instType: 'USDT-FUTURES', channel: 'books15', instId: 'RUNEUSDT' },
            ],
          })
        );
      };

      ws.onmessage = (event) => {
        const raw = event.data?.toString() || '';
        if (raw === 'pong') return;

        try {
          const parsed = JSON.parse(raw) as BitgetWsMessage<any>;
          if (parsed.data && parsed.data.length > 0) {
            if (parsed.arg?.channel === 'ticker') {
              tickerResult = parsed.data[0];
            } else if (parsed.arg?.channel === 'books15') {
              bookResult = parsed.data[0];
            }

            if (tickerResult && bookResult) {
              clearTimeout(timeout);
              ws.close();
              resolve({ ticker: tickerResult, books: bookResult });
            }
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

    expect(streamData.ticker.instId).toBe('RUNEUSDT');
    expect(parseFloat(streamData.ticker.lastPr)).toBeGreaterThan(0);
    expect(streamData.books.bids.length).toBeGreaterThan(0);
    expect(streamData.books.asks.length).toBeGreaterThan(0);
  }, 12000);

  test('Public WebSocket streams live SPOT ticker & order book (books) for rToken (RTSLAUSDT)', async () => {
    const streamData = await new Promise<{
      ticker: BitgetWsTickerData;
      books: BitgetWsBookData;
    }>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      let tickerResult: BitgetWsTickerData | null = null;
      let bookResult: BitgetWsBookData | null = null;

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('rToken WebSocket test timed out after 8000ms'));
      }, 8000);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            op: 'subscribe',
            args: [
              { instType: 'SPOT', channel: 'ticker', instId: 'RTSLAUSDT' },
              { instType: 'SPOT', channel: 'books', instId: 'RTSLAUSDT' },
            ],
          })
        );
      };

      ws.onmessage = (event) => {
        const raw = event.data?.toString() || '';
        if (raw === 'pong') return;

        try {
          const parsed = JSON.parse(raw) as BitgetWsMessage<any>;
          if (parsed.data && parsed.data.length > 0) {
            if (parsed.arg?.channel === 'ticker') {
              tickerResult = parsed.data[0];
            } else if (parsed.arg?.channel === 'books') {
              bookResult = parsed.data[0];
            }

            if (tickerResult && bookResult) {
              clearTimeout(timeout);
              ws.close();
              resolve({ ticker: tickerResult, books: bookResult });
            }
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

    expect(streamData.ticker.instId).toBe('RTSLAUSDT');
    expect(parseFloat(streamData.ticker.lastPr)).toBeGreaterThan(0);
    expect(streamData.books.bids.length).toBeGreaterThan(0);
    expect(streamData.books.asks.length).toBeGreaterThan(0);
  }, 12000);

  test('Public WebSocket multiplexes SPOT rToken (RTSLAUSDT) and FUTURES (TSLAUSDT) concurrently', async () => {
    const streamData = await new Promise<{
      spotPrice: number;
      spotBids: number;
      fundingRate: string;
      markPrice: number;
    }>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      let spotPrice: number | null = null;
      let spotBids: number | null = null;
      let fundingRate: string | null = null;
      let markPrice: number | null = null;

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Multiplexed equity WebSocket test timed out after 8000ms'));
      }, 8000);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            op: 'subscribe',
            args: [
              { instType: 'SPOT', channel: 'ticker', instId: 'RTSLAUSDT' },
              { instType: 'SPOT', channel: 'books', instId: 'RTSLAUSDT' },
              { instType: 'USDT-FUTURES', channel: 'ticker', instId: 'TSLAUSDT' },
            ],
          })
        );
      };

      ws.onmessage = (event) => {
        const raw = event.data?.toString() || '';
        if (raw === 'pong') return;

        try {
          const parsed = JSON.parse(raw) as BitgetWsMessage<any>;
          if (parsed.data && parsed.data.length > 0) {
            if (parsed.arg?.instType === 'SPOT' && parsed.arg?.channel === 'ticker') {
              spotPrice = parseFloat(parsed.data[0].lastPr);
            } else if (parsed.arg?.instType === 'SPOT' && parsed.arg?.channel === 'books') {
              spotBids = parsed.data[0].bids?.length || 0;
            } else if (parsed.arg?.instType === 'USDT-FUTURES' && parsed.arg?.channel === 'ticker') {
              fundingRate = parsed.data[0].fundingRate;
              markPrice = parseFloat(parsed.data[0].markPrice);
            }

            if (spotPrice !== null && spotBids !== null && fundingRate !== null && markPrice !== null) {
              clearTimeout(timeout);
              ws.close();
              resolve({ spotPrice, spotBids, fundingRate, markPrice });
            }
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

    expect(streamData.spotPrice).toBeGreaterThan(0);
    expect(streamData.spotBids).toBeGreaterThan(0);
    expect(streamData.markPrice).toBeGreaterThan(0);
    expect(typeof streamData.fundingRate).toBe('string');
  }, 12000);

  test('Public WebSocket executes graceful unsubscription lifecycle', async () => {
    const unsubResult = await new Promise<{
      subscribed: boolean;
      unsubscribed: boolean;
    }>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      let subscribed = false;
      let unsubscribed = false;

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Unsubscribe lifecycle test timed out after 7000ms'));
      }, 7000);

      ws.onopen = () => {
        // Subscribe first
        ws.send(
          JSON.stringify({
            op: 'subscribe',
            args: [{ instType: 'SPOT', channel: 'ticker', instId: 'ETHUSDT' }],
          })
        );
      };

      ws.onmessage = (event) => {
        const raw = event.data?.toString() || '';
        try {
          const parsed = JSON.parse(raw) as BitgetWsMessage<any>;
          if (parsed.event === 'subscribe') {
            subscribed = true;
            // Send unsubscribe command
            ws.send(
              JSON.stringify({
                op: 'unsubscribe',
                args: [{ instType: 'SPOT', channel: 'ticker', instId: 'ETHUSDT' }],
              })
            );
          } else if (parsed.event === 'unsubscribe') {
            unsubscribed = true;
            clearTimeout(timeout);
            ws.close();
            resolve({ subscribed, unsubscribed });
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

    expect(unsubResult.subscribed).toBe(true);
    expect(unsubResult.unsubscribed).toBe(true);
  }, 10000);

  test('Public WebSocket receives and processes subscription error without socket crash', async () => {
    const errorResponse = await new Promise<{
      errorReceived: boolean;
      errorCode?: number;
      errorMsg?: string;
      socketOpen: boolean;
    }>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Subscription error test timed out after 7000ms'));
      }, 7000);

      ws.onopen = () => {
        // Subscribe to intentionally invalid channel/instId
        ws.send(
          JSON.stringify({
            op: 'subscribe',
            args: [{ instType: 'SPOT', channel: 'invalid_channel', instId: 'NONEXISTENT_PAIR_123' }],
          })
        );
      };

      ws.onmessage = (event) => {
        const raw = event.data?.toString() || '';
        try {
          const parsed = JSON.parse(raw) as BitgetWsMessage<any>;
          if (parsed.event === 'error' || (parsed.code && parsed.code !== 0)) {
            clearTimeout(timeout);
            const isOpen = ws.readyState === WebSocket.OPEN;
            ws.close();
            resolve({
              errorReceived: true,
              errorCode: parsed.code,
              errorMsg: parsed.msg,
              socketOpen: isOpen,
            });
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

    expect(errorResponse.errorReceived).toBe(true);
    expect(errorResponse.socketOpen).toBe(true);
  }, 10000);

});
