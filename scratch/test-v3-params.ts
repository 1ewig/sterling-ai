async function testCandles() {
  const intervals = ['1h', '1H', '60m', '1m', '1min'];
  for (const intervalParam of ['interval', 'granularity']) {
    for (const val of intervals) {
      try {
        const url = `https://api.bitget.com/api/v3/market/candles?category=USDT-FUTURES&symbol=BTCUSDT&${intervalParam}=${val}&limit=5`;
        const res = await fetch(url);
        const json = await res.json();
        console.log(`Param: ${intervalParam}=${val} -> status: ${res.status}, code: ${json.code}, msg: ${json.msg}, data length: ${json.data?.length}`);
      } catch (e) {
        console.error(e);
      }
    }
  }

  // Also check orderbook structure
  const obRes = await fetch(`https://api.bitget.com/api/v3/market/orderbook?category=USDT-FUTURES&symbol=BTCUSDT&limit=5`);
  const obJson = await obRes.json();
  console.log('Orderbook full json:', JSON.stringify(obJson, null, 2));
}

testCandles();
