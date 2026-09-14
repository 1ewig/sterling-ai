import crypto from 'node:crypto';

async function main() {
  console.log('--- Testing Bitget Private WebSocket Channel Variations ---');

  const isDemo = process.env.BITGET_DEMO_TRADING === 'true';
  const apiKey = process.env.BITGET_API_KEY;
  const apiSecret = process.env.BITGET_API_SECRET;
  const passphrase = process.env.BITGET_PASSPHRASE;

  if (!apiKey || !apiSecret || !passphrase) {
    console.error('Missing Bitget environment variables in .env.local');
    process.exit(1);
  }

  const wsUrl = isDemo
    ? 'wss://wspap.bitget.com/v2/ws/private'
    : 'wss://ws.bitget.com/v2/ws/private';

  const ws = new globalThis.WebSocket(wsUrl);

  const timeout = setTimeout(() => {
    console.log('\nFinished testing variations. Closing WS...');
    ws.close();
    process.exit(0);
  }, 10000);

  ws.onopen = () => {
    console.log('[WS] Connected. Sending login...');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signPath = '/user/verify';
    const preHash = `${timestamp}GET${signPath}`;
    const sign = crypto.createHmac('sha256', apiSecret).update(preHash).digest('base64');

    ws.send(
      JSON.stringify({
        op: 'login',
        args: [{ apiKey, passphrase, timestamp, sign }],
      })
    );
  };

  ws.onmessage = (event) => {
    const raw = event.data.toString();
    try {
      const parsed = JSON.parse(raw) as {
        event?: string;
        code?: number;
        arg?: Record<string, string>;
        data?: unknown[];
      };

      if (parsed.event === 'login') {
        console.log('[WS] Login result:', parsed);
        if (parsed.code === 0) {
          const testArgs = [
            { instType: 'USDT-FUTURES', channel: 'positions', instId: 'default' },
            { instType: 'USDT-FUTURES', channel: 'orders', instId: 'default' },
            { instType: 'USDT-FUTURES', channel: 'account', coin: 'default' },
            { instType: 'USDT-FUTURES', channel: 'orders-algo', instId: 'default' },
            { instType: 'SPOT', channel: 'account', coin: 'default' },
            { instType: 'SPOT', channel: 'orders', instId: 'default' },
          ];

          console.log('\n[WS] Sending subscriptions for positions, orders, account...');
          ws.send(JSON.stringify({ op: 'subscribe', args: testArgs }));
        }
      } else {
        console.log('[WS] Push event received:', JSON.stringify(parsed, null, 2));
      }
    } catch {
      console.log('[WS] Raw frame:', raw);
    }
  };

  ws.onclose = () => {
    console.log('[WS] Socket closed.');
    clearTimeout(timeout);
  };
}

main().catch(console.error);
