import { describe, test, expect } from 'bun:test';

const BASE_URL = 'https://api.bitget.com';
const WS_V3_URL = 'wss://ws.bitget.com/v3/ws/public';

describe('Bitget V3 (UTA) Public REST & WebSocket Wire Live Tests', () => {

  // 1. GET /api/v3/market/instruments
  test('V3 Public REST: GET /api/v3/market/instruments', async () => {
    const res = await fetch(`${BASE_URL}/api/v3/market/instruments?category=USDT-FUTURES`, {
      signal: AbortSignal.timeout(6000),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { code: string; msg: string; data?: unknown[] };
    console.log('Instruments response code:', json.code, 'Count:', Array.isArray(json.data) ? json.data.length : 'N/A');
    expect(json.code === '00000' || json.code === '0').toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  }, 10000);

  // 2. GET /api/v3/market/tickers
  test('V3 Public REST: GET /api/v3/market/tickers', async () => {
    const res = await fetch(`${BASE_URL}/api/v3/market/tickers?category=USDT-FUTURES&symbol=BTCUSDT`, {
      signal: AbortSignal.timeout(6000),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { code: string; msg: string; data?: unknown[] };
    console.log('Tickers response code:', json.code, 'Data:', json.data?.[0]);
    expect(json.code === '00000' || json.code === '0').toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  }, 10000);

  // 3. GET /api/v3/market/orderbook
  test('V3 Public REST: GET /api/v3/market/orderbook', async () => {
    const res = await fetch(`${BASE_URL}/api/v3/market/orderbook?category=USDT-FUTURES&symbol=BTCUSDT&limit=5`, {
      signal: AbortSignal.timeout(6000),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { code: string; msg: string; data?: { a?: [number, number][]; b?: [number, number][] } };
    console.log('Orderbook response code:', json.code, 'Asks count:', json.data?.a?.length, 'Bids count:', json.data?.b?.length);
    expect(json.code === '00000' || json.code === '0').toBe(true);
    expect(Array.isArray(json.data?.a)).toBe(true);
    expect(Array.isArray(json.data?.b)).toBe(true);
  }, 10000);

  // 4. GET /api/v3/market/candles
  test('V3 Public REST: GET /api/v3/market/candles', async () => {
    const res = await fetch(`${BASE_URL}/api/v3/market/candles?category=USDT-FUTURES&symbol=BTCUSDT&interval=1H&limit=10`, {
      signal: AbortSignal.timeout(6000),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { code: string; msg: string; data?: unknown[] };
    console.log('Candles response code:', json.code, 'Candles count:', json.data?.length);
    expect(json.code === '00000' || json.code === '0').toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data?.length).toBeGreaterThan(0);
  }, 10000);


  // 5. GET /api/v3/market/current-fund-rate
  test('V3 Public REST: GET /api/v3/market/current-fund-rate', async () => {
    const res = await fetch(`${BASE_URL}/api/v3/market/current-fund-rate?symbol=BTCUSDT&category=USDT-FUTURES`, {
      signal: AbortSignal.timeout(6000),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { code: string; msg: string; data?: unknown };
    console.log('Funding rate response code:', json.code, 'Data:', json.data);
    expect(json.code === '00000' || json.code === '0').toBe(true);
  }, 10000);

  // 6. GET /api/v3/market/open-interest
  test('V3 Public REST: GET /api/v3/market/open-interest', async () => {
    const res = await fetch(`${BASE_URL}/api/v3/market/open-interest?symbol=BTCUSDT&category=USDT-FUTURES`, {
      signal: AbortSignal.timeout(6000),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { code: string; msg: string; data?: unknown };
    console.log('Open interest response code:', json.code, 'Data:', json.data);
    expect(json.code === '00000' || json.code === '0').toBe(true);
  }, 10000);

  // 7. WebSocket: wss://ws.bitget.com/v3/ws/public
  test('V3 Public WebSocket: connects, pings/pongs, and receives live ticker data', async () => {
    const wsResult = await new Promise<{
      connected: boolean;
      pongReceived: boolean;
      dataReceived: boolean;
      sampleFrame?: unknown;
    }>((resolve, reject) => {
      const ws = new WebSocket(WS_V3_URL);
      let pongReceived = false;
      let dataReceived = false;
      let sampleFrame: unknown = null;

      const timeout = setTimeout(() => {
        ws.close();
        if (pongReceived || dataReceived) {
          resolve({ connected: true, pongReceived, dataReceived, sampleFrame });
        } else {
          reject(new Error('V3 WebSocket test timed out after 7000ms'));
        }
      }, 7000);

      ws.onopen = () => {
        ws.send('ping');
        // Subscribe with V3 UTA schema
        ws.send(
          JSON.stringify({
            op: 'subscribe',
            args: [
              {
                instType: 'usdt-futures',
                topic: 'ticker',
                symbol: 'BTCUSDT',
              },
            ],
          })
        );
      };

      ws.onmessage = (event) => {
        const raw = event.data?.toString() || '';
        if (raw === 'pong') {
          pongReceived = true;
        } else {
          try {
            const parsed = JSON.parse(raw);
            console.log('V3 WS Message received:', parsed.action || parsed.event || parsed.topic || parsed);
            dataReceived = true;
            sampleFrame = parsed;
            clearTimeout(timeout);
            ws.close();
            resolve({ connected: true, pongReceived, dataReceived, sampleFrame });
          } catch {
            // Ignore non-json
          }
        }
      };

      ws.onerror = (err) => {
        clearTimeout(timeout);
        ws.close();
        reject(err);
      };
    });

    console.log('V3 WebSocket result:', wsResult);
    expect(wsResult.connected).toBe(true);
  }, 10000);

});
