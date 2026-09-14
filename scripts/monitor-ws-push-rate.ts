import crypto from 'node:crypto';

async function main() {
  console.log('=== Monitoring Bitget Private WebSocket Live Push Rate ===');
  console.log('Testing how often Bitget pushes updates when trades are active...\n');

  const isDemo = process.env.BITGET_DEMO_TRADING === 'true';
  const apiKey = process.env.BITGET_API_KEY!;
  const apiSecret = process.env.BITGET_API_SECRET!;
  const passphrase = process.env.BITGET_PASSPHRASE!;

  const wsUrl = isDemo
    ? 'wss://wspap.bitget.com/v2/ws/private'
    : 'wss://ws.bitget.com/v2/ws/private';

  const ws = new globalThis.WebSocket(wsUrl);

  const startTime = Date.now();
  let msgCount = 0;
  let lastMsgTime = startTime;
  const channelCounts: Record<string, number> = {};

  const timeout = setTimeout(() => {
    console.log('\n=== Summary After 40 Seconds ===');
    console.log(`Total messages received: ${msgCount}`);
    console.log('Messages per channel:', channelCounts);
    ws.close();
    process.exit(0);
  }, 40000);

  ws.onopen = () => {
    console.log('[WS] Connected. Authenticating...');
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
    const now = Date.now();
    const elapsedTotal = ((now - startTime) / 1000).toFixed(2);
    const deltaFromLast = now - lastMsgTime;
    lastMsgTime = now;

    const raw = event.data.toString();
    if (raw === 'pong') {
      console.log(`[+${elapsedTotal}s] [PONG] (${deltaFromLast}ms since last frame)`);
      return;
    }

    try {
      const parsed = JSON.parse(raw);

      if (parsed.event === 'login') {
        console.log(`[+${elapsedTotal}s] [LOGIN SUCCESS] Subscribing to positions, orders, account...`);
        const args = [
          { instType: 'USDT-FUTURES', channel: 'positions', instId: 'default' },
          { instType: 'USDT-FUTURES', channel: 'orders', instId: 'default' },
          { instType: 'USDT-FUTURES', channel: 'orders-algo', instId: 'default' },
          { instType: 'USDT-FUTURES', channel: 'account', coin: 'default' },
        ];
        ws.send(JSON.stringify({ op: 'subscribe', args }));
        return;
      }

      if (parsed.event === 'subscribe') {
        console.log(`[+${elapsedTotal}s] [SUBSCRIBED] ${parsed.arg?.channel}`);
        return;
      }

      msgCount++;
      const channel = parsed.arg?.channel || 'unknown';
      channelCounts[channel] = (channelCounts[channel] || 0) + 1;

      console.log(`\n[+${elapsedTotal}s] [PUSH #${msgCount}] Channel: "${channel}" (Delta: ${deltaFromLast}ms)`);
      console.log(`Action: ${parsed.action}, Data length: ${parsed.data?.length || 0}`);
      
      if (parsed.data && parsed.data.length > 0) {
        const item = parsed.data[0];
        if (channel === 'positions') {
          console.log(`Position Sample: symbol=${item.symbol}, posSide=${item.posSide}, total=${item.total}, markPrice=${item.markPrice}, uPnl=${item.unrealisedPnl || item.unrealizedPL}`);
        } else if (channel === 'orders') {
          console.log(`Order Sample: symbol=${item.symbol}, status=${item.status || item.orderStatus}, size=${item.size || item.qty}`);
        } else if (channel === 'account') {
          console.log(`Account Sample: equity=${item.equity || item.usdtEquity}, available=${item.available}`);
        }
      }
    } catch {
      console.log(`[+${elapsedTotal}s] [RAW]`, raw);
    }
  };

  // Keep alive ping every 10s
  const pingInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send('ping');
    }
  }, 10000);

  ws.onclose = () => {
    clearInterval(pingInterval);
    clearTimeout(timeout);
    console.log('[WS] Closed.');
  };
}

main().catch(console.error);
