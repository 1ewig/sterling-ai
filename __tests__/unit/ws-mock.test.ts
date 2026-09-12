import { describe, test, expect, afterAll, beforeAll } from 'bun:test';
import { L2Orderbook } from '@/lib/bitget/l2-book';
import type { BitgetWsBookData, BitgetWsMessage } from '@/lib/bitget/types';

describe('Offline Mock WebSocket Protocol & Fault Tolerance Suite', () => {
  let server: ReturnType<typeof Bun.serve>;
  let port: number;
  let wsUrl: string;

  beforeAll(() => {
    // Start local zero-dependency mock WebSocket server on random high port
    server = Bun.serve({
      port: 0,
      fetch(req, s) {
        if (s.upgrade(req, { data: undefined })) {
          return undefined;
        }
        return new Response('Mock WS Server', { status: 200 });
      },
      websocket: {
        open(ws) {
          ws.subscribe('market-stream');
        },
        message(ws, msg) {
          const text = msg.toString();
          if (text === 'ping') {
            ws.send('pong');
            return;
          }
          try {
            const parsed = JSON.parse(text);
            if (parsed.op === 'subscribe') {
              ws.send(JSON.stringify({ event: 'subscribe', arg: parsed.args[0] }));
            }
          } catch {
            ws.send('invalid-frame');
          }
        },
        close(ws) {
          ws.unsubscribe('market-stream');
        },
      },
    });

    port = server.port ?? 3000;
    wsUrl = `ws://localhost:${port}`;
  });

  afterAll(() => {
    server.stop(true);
  });

  test('handles ping-pong heartbeat cycle deterministically', async () => {
    const pongReceived = await new Promise<boolean>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Mock ping-pong timed out'));
      }, 1000);

      ws.onopen = () => {
        ws.send('ping');
      };

      ws.onmessage = (event) => {
        if (event.data?.toString() === 'pong') {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        }
      };

      ws.onerror = (err) => {
        clearTimeout(timeout);
        ws.close();
        reject(err);
      };
    });

    expect(pongReceived).toBe(true);
  });

  test('receives mock snapshot and merges mock deltas into L2Orderbook offline', async () => {
    const book = new L2Orderbook();

    const mockSnapshotMessage: BitgetWsMessage<BitgetWsBookData> = {
      action: 'snapshot',
      arg: { instType: 'SPOT', channel: 'books', instId: 'BTCUSDT' },
      data: [
        {
          asks: [
            ['65100.0', '1.0'],
            ['65200.0', '2.0'],
          ],
          bids: [
            ['65000.0', '1.5'],
            ['64900.0', '2.5'],
          ],
          ts: '1726000000000',
        },
      ],
    };

    const mockDeltaMessage: BitgetWsMessage<BitgetWsBookData> = {
      action: 'update',
      arg: { instType: 'SPOT', channel: 'books', instId: 'BTCUSDT' },
      data: [
        {
          asks: [
            ['65050.0', '0.5'], // New best ask
            ['65200.0', '0'],   // Deletion
          ],
          bids: [
            ['65000.0', '3.0'], // Size modification
          ],
          ts: '1726000001000',
        },
      ],
    };

    // 1. Process snapshot
    expect(mockSnapshotMessage.action).toBe('snapshot');
    expect(mockSnapshotMessage.data).toBeDefined();
    if (!mockSnapshotMessage.data || !mockDeltaMessage.data) return;

    book.applySnapshot(mockSnapshotMessage.data[0], false);
    expect(book.hasData()).toBe(true);
    expect(book.getTop(8).asks[0][0]).toBe('65100.0');

    // 2. Process delta
    expect(mockDeltaMessage.action).toBe('update');
    const updatedTop = book.applyUpdate(mockDeltaMessage.data[0]);
    expect(updatedTop).not.toBeNull();
    if (!updatedTop) return;

    // Verify 65050.0 is new best ask and 65200.0 was removed
    expect(updatedTop.asks[0]).toEqual(['65050.0', '0.5']);
    expect(updatedTop.asks).toHaveLength(2);
    // Verify 65000.0 bid updated to 3.0
    expect(updatedTop.bids[0]).toEqual(['65000.0', '3']);
  });

  test('resilient to malformed non-JSON server frames without unhandled exceptions', async () => {
    const errorSurvives = await new Promise<boolean>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Malformed frame test timed out'));
      }, 1000);

      ws.onopen = () => {
        ws.send('NOT_A_VALID_JSON_STRING');
      };

      ws.onmessage = (event) => {
        const raw = event.data?.toString();
        // Client parser simulation:
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          // Gracefully dropped frame
        }

        expect(parsed).toBeNull();
        expect(raw).toBe('invalid-frame');
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      };

      ws.onerror = (err) => {
        clearTimeout(timeout);
        ws.close();
        reject(err);
      };
    });

    expect(errorSurvives).toBe(true);
  });

  test('exponential backoff reconnect interval calculation', () => {
    function getReconnectDelay(attempt: number): number {
      const base = 1000;
      const max = 8000;
      return Math.min(base * Math.pow(2, attempt), max);
    }

    expect(getReconnectDelay(0)).toBe(1000);
    expect(getReconnectDelay(1)).toBe(2000);
    expect(getReconnectDelay(2)).toBe(4000);
    expect(getReconnectDelay(3)).toBe(8000);
    expect(getReconnectDelay(4)).toBe(8000); // Capped at 8s
  });
});
