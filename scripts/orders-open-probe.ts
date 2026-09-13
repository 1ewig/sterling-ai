/**
 * Bitget UTA v3 Open-Orders Endpoint Probe
 *
 * Diagnoses the unfilled-orders endpoint used by the `get_open_orders` agent tool:
 *   - GET /api/v3/trade/unfilled-orders (per category, with cursor checks)
 *   - live order-shape + cursor-paginated-field verification
 *   - invalid-symbol / limit / cursor / time-window error-code mapping
 *   - (demo only) place one far-OOM limit order → verify mapped fields → cancel
 *
 * Run:  bun run scripts/orders-open-probe.ts
 * Reads credentials from .env.local (Bun auto-loads it). No secrets are printed.
 */
import { BITGET_REST_BASE } from '../src/lib/bitget/rest';
import { getAuthHeaders } from '../src/lib/bitget/auth/signer';
import { getInstrument } from '../src/lib/bitget/trade/instruments';
import { fetchBitgetTicker } from '../src/lib/bitget/rest';
import { placeOrderV3, cancelOrderV3 } from '../src/lib/bitget/trade/orders';
import { fetchOpenOrdersV3 } from '../src/lib/bitget/trade/queries';
import type { BitgetV3OrderParams, BitgetV3OrderInfo } from '../src/lib/bitget/types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function maskKey(): string {
  const k = process.env.BITGET_API_KEY || '(unset)';
  return k.length > 8 ? `${k.slice(0, 4)}...${k.slice(-4)}` : k;
}

async function probeGet(label: string, path: string, query = '') {
  const q = query ? `?${query}` : '';
  const headers = getAuthHeaders('GET', path, query);
  const t0 = Date.now();
  let httpStatus = 0;
  let bodyRaw = '';
  try {
    const res = await fetch(`${BITGET_REST_BASE}${path}${q}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000),
    });
    httpStatus = res.status;
    bodyRaw = await res.text();
  } catch (err) {
    bodyRaw = `FETCH ERROR: ${err instanceof Error ? err.message : String(err)}`;
  }
  const elapsed = Date.now() - t0;
  let parsed: unknown = bodyRaw;
  let jsonOk = false;
  try {
    parsed = JSON.parse(bodyRaw);
    jsonOk = typeof parsed === 'object' && parsed !== null;
  } catch {
    // non-JSON body
  }
  console.log(`\n=== ${label}  GET ${path}${q}  [HTTP ${httpStatus}] ${elapsed}ms`);
  if (!jsonOk) {
    console.log(bodyRaw.slice(0, 2000));
  } else {
    console.log(JSON.stringify(parsed, null, 2));
  }
  return { label, httpStatus, elapsedMs: elapsed, jsonOk, body: parsed };
}

async function probeCall<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  const t0 = Date.now();
  try {
    const result = await fn();
    console.log(`\n=== ${label}  [OK ${Date.now() - t0}ms]`);
    console.log(JSON.stringify(result, null, 2)?.slice(0, 8000));
    return result;
  } catch (err) {
    console.log(`\n=== ${label}  [THREW ${Date.now() - t0}ms]`);
    console.log(err instanceof Error ? err.message : String(err));
    return undefined;
  }
}

async function main() {
  console.log('Bitget UTA v3 Open-Orders Probe');
  console.log(`REST base       : ${BITGET_REST_BASE}`);
  console.log(`API key         : ${maskKey()}`);
  console.log(`Demo trading    : ${process.env.BITGET_DEMO_TRADING === 'true' ? 'YES (paptrading:1)' : 'NO (live)'}`);
  console.log('Keys present    :', {
    key: !!process.env.BITGET_API_KEY,
    secret: !!process.env.BITGET_API_SECRET,
    passphrase: !!process.env.BITGET_PASSPHRASE,
  });

  // --- Section 1: Raw endpoint behaviour (read-only GETs) ---
  console.log('\n\n========== Section 1: Raw endpoint behaviour ==========');

  for (const cat of ['SPOT', 'USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES', 'MARGIN']) {
    await probeGet(`unfilled-orders category=${cat}`, '/api/v3/trade/unfilled-orders', `category=${cat}`);
    await sleep(250);
  }

  await probeGet('invalid symbol FOOBAR123', '/api/v3/trade/unfilled-orders', 'category=USDT-FUTURES&symbol=FOOBAR123');
  await sleep(250);
  await probeGet('limit=101 (docs max=100)', '/api/v3/trade/unfilled-orders', 'category=USDT-FUTURES&limit=101');
  await sleep(250);
  await probeGet('garbage cursor abc123', '/api/v3/trade/unfilled-orders', 'category=USDT-FUTURES&cursor=abc123');
  await sleep(250);
  await probeGet('startTime=1 endTime=2000000000000 (window >90d)', '/api/v3/trade/unfilled-orders', 'category=USDT-FUTURES&startTime=1&endTime=2000000000000');
  await sleep(500);

  // --- Section 2: fetchOpenOrdersV3 + getUnfilledOrdersV3 (read-only) ---
  console.log('\n\n========== Section 2: fetchOpenOrdersV3 behaviour ==========');

  await probeCall('fetchOpenOrdersV3 default (usdt-futures)', () => fetchOpenOrdersV3({ categoryInput: 'usdt-futures' }));
  await probeCall('fetchOpenOrdersV3 all', () => fetchOpenOrdersV3({ categoryInput: 'all' }));
  await probeCall('fetchOpenOrdersV3 spot', () => fetchOpenOrdersV3({ categoryInput: 'spot' }));
  await probeCall('fetchOpenOrdersV3 coin-futures', () => fetchOpenOrdersV3({ categoryInput: 'coin-futures' }));
  await probeCall('fetchOpenOrdersV3 symbol=BTCUSDT', () => fetchOpenOrdersV3({ symbol: 'BTCUSDT', categoryInput: 'usdt-futures' }));
  await probeCall('fetchOpenOrdersV3 invalid symbol', () => fetchOpenOrdersV3({ symbol: 'FOOBAR123', categoryInput: 'usdt-futures' }));

  // --- Section 3: Demo write round-trip (place → verify fields → cancel) ---
  const isDemo = process.env.BITGET_DEMO_TRADING === 'true';
  console.log(`\n\n========== Section 3: Demo write round-trip (${isDemo ? 'ENABLED' : 'SKIPPED'}) ==========`);
  if (!isDemo) {
    console.log('Set BITGET_DEMO_TRADING=true in .env.local to enable the demo write round-trip.');
  } else {
    try {
      // 3a. Instrument + live price
      const [inst, ticker] = await Promise.all([getInstrument('BTCUSDT', 'usdt-futures'), fetchBitgetTicker('BTCUSDT', true)]);
      console.log('\n--- BTCUSDT instrument ---');
      console.log(JSON.stringify({ minTradeNum: inst.minTradeNum, pricePlace: inst.pricePlace, volumePlace: inst.volumePlace, status: inst.status }, null, 2));
      const last = parseFloat(ticker.lastPr || '0');
      console.log(`\nLive price: $${last}`);
      if (last <= 0) throw new Error('Unable to read live BTCUSDT price — aborting round-trip.');

      // 3b. Build a far-OOM limit BUY (0.5% below market → stays unfilled, within ±7% band)
      const mult = parseFloat(inst.priceMultiplier || '0.1') || 0.1;
      const limitPrice = Math.round((last * 0.995) / mult) * mult; // snap to exchange tick (BTCUSDT futures tick = 0.1)
      const volPlace = parseInt(inst.volumePlace || '2', 10);
      const qty = parseFloat(Math.max(parseFloat(inst.minTradeNum || '0.001'), 0.01).toFixed(volPlace));
      const clientOid = `sterling_probe_${Date.now()}`;
      console.log(`\nPlacing limit BUY  qty=${qty} price=$${limitPrice} (0.5% below market, tick ${mult})  clientOid=${clientOid}`);

      const placeResult = await placeOrderV3({
        symbol: 'BTCUSDT',
        category: 'usdt-futures',
        side: 'buy',
        orderType: 'limit',
        size: qty.toString(),
        price: limitPrice.toString(),
        posSide: 'long',
        marginMode: 'crossed',
        clientOid,
        timeInForce: 'gtc',
      } satisfies BitgetV3OrderParams);

      console.log('\n--- placeOrderV3 result ---');
      console.log(JSON.stringify(placeResult, null, 2));

      if (!placeResult.orderId) {
        console.warn('\nWARNING: orderId is empty/null — the order may have been rejected. Attempting cancel anyway via clientOid.');
      }

      await sleep(1200); // let Bitget indexing propagate

      // 3c. Verify via fetchOpenOrdersV3
      const openResult = await fetchOpenOrdersV3({ symbol: 'BTCUSDT', categoryInput: 'usdt-futures' });
      const found = openResult.orders.find(
        (o: BitgetV3OrderInfo) => o.orderId === placeResult.orderId || (placeResult.clientOid && o.clientOid === placeResult.clientOid)
      );
      console.log('\n--- fetchOpenOrdersV3 order found? ' + (found ? 'YES' : 'NO') + ' ---');
      if (found) {
        console.log(JSON.stringify(found, null, 2));
        // field-level assertions
        console.log('\n--- field audit ---');
        console.log(`  size           = ${found.size}  (should be numeric base-coin qty)`);
        console.log(`  status/rawStatus = ${found.status} / ${found.rawStatus}  (should be 'live' or 'new')`);
        console.log(`  posSide        = '${found.posSide ?? ''}'  (should be 'long')`);
        console.log(`  holdMode       = '${found.holdMode ?? ''}'  (should be 'hedge_mode')`);
        console.log(`  reduceOnly     = '${found.reduceOnly ?? ''}'  (should be 'NO')`);
        console.log(`  delegateType   = '${found.delegateType ?? ''}'  (should be 'normal')`);
        console.log(`  timeInForce    = '${found.timeInForce ?? ''}'  (should be 'gtc')`);
        console.log(`  category       = '${found.category}'  (should be 'USDT-FUTURES')`);
        console.log(`  cTime present  = ${!!found.cTime}  (should be truthy)`);
      }

      // 3d. Cancel it
      const cancelResult = await cancelOrderV3({
        symbol: 'BTCUSDT',
        category: 'usdt-futures',
        orderId: placeResult.orderId || undefined,
        clientOid: placeResult.clientOid || clientOid,
      });
      console.log('\n--- cancelOrderV3 result ---');
      console.log(JSON.stringify(cancelResult, null, 2));

      await sleep(1000);

      // 3e. Confirm it's gone
      const postCancel = await fetchOpenOrdersV3({ symbol: 'BTCUSDT', categoryInput: 'usdt-futures' });
      const stillThere = postCancel.orders.find(
        (o: BitgetV3OrderInfo) => o.orderId === placeResult.orderId || o.clientOid === clientOid
      );
      console.log(`\nPost-cancel check: order ${stillThere ? 'STILL PRESENT (problem)' : 'removed (OK)'}`);

      // 3f. Raw JSON shape confirmation
      await probeGet('raw post-cancel (should be empty)', '/api/v3/trade/unfilled-orders', 'category=USDT-FUTURES&symbol=BTCUSDT&limit=10');
    } catch (err) {
      console.error('\nRound-trip failed:', err instanceof Error ? err.message : String(err));
    }
  }

  console.log('\nProbe complete.');
}

main().catch((err) => {
  console.error('Probe crashed:', err);
  process.exit(1);
});
