/**
 * Bitget UTA v3 Position-Close Probe
 *
 * Diagnoses the close_position agent tool chain (stage ticket -> /api/trade/action
 * -> closePositionsV3 -> place-order reduce-only) plus the native v3 close endpoint:
 *   - Section 1: read-only / no-op-reject error-code mapping for close order payloads
 *   - Section 2: current futures position state
 *   - Section 3: (demo only) open market hedge long -> partial close -> full close,
 *                audit order-info tradeSide, native /close-positions comparison
 *
 * Run:  bun run scripts/positions-close-probe.ts
 * Reads credentials from .env.local (Bun auto-loads it). No secrets are printed.
 */
import { BITGET_REST_BASE } from '../src/lib/bitget/rest';
import { getAuthHeaders } from '../src/lib/bitget/auth/signer';
import { getInstrument, snapQtyToStep } from '../src/lib/bitget/trade/instruments';
import { placeOrderV3, closePositionsV3, getOrderInfoV3 } from '../src/lib/bitget/trade/orders';
import { getPositionsV3 } from '../src/lib/bitget/trade/positions';
import type { BitgetV3Position } from '../src/lib/bitget/types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DEMO = process.env.BITGET_DEMO_TRADING === 'true';

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
    const res = await fetch(`${BITGET_REST_BASE}${path}${q}`, { method: 'GET', headers, signal: AbortSignal.timeout(10000) });
    httpStatus = res.status;
    bodyRaw = await res.text();
  } catch (err) {
    bodyRaw = `FETCH ERROR: ${err instanceof Error ? err.message : String(err)}`;
  }
  const elapsed = Date.now() - t0;
  console.log(`\n=== ${label}  ${path}${q}  [HTTP ${httpStatus}] ${elapsed}ms`);
  try {
    const parsed = JSON.parse(bodyRaw);
    const slim: Record<string, unknown> = { code: parsed.code, msg: parsed.msg, data: parsed.data };
    console.log(JSON.stringify(slim, null, 2).slice(0, 1200));
  } catch {
    console.log(bodyRaw.slice(0, 500));
  }
}

async function postProbe(label: string, path: string, body: Record<string, unknown>) {
  const headers = getAuthHeaders('POST', path, '', body);
  const t0 = Date.now();
  let httpStatus = 0;
  let bodyRaw = '';
  try {
    const res = await fetch(`${BITGET_REST_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    httpStatus = res.status;
    bodyRaw = await res.text();
  } catch (err) {
    bodyRaw = `FETCH ERROR: ${err instanceof Error ? err.message : String(err)}`;
  }
  const elapsed = Date.now() - t0;
  console.log(`\n=== ${label}  POST ${path}  [HTTP ${httpStatus}] ${elapsed}ms`);
  try {
    const parsed = JSON.parse(bodyRaw);
    const slim: Record<string, unknown> = { code: parsed.code, msg: parsed.msg, data: parsed.data };
    console.log(JSON.stringify(slim, null, 2).slice(0, 1200));
  } catch {
    console.log(bodyRaw.slice(0, 500));
  }
}

function findPos(positions: BitgetV3Position[], sym: string, posSide?: string): BitgetV3Position | undefined {
  const n = sym.toUpperCase();
  return positions.find(
    (p) => p.symbol.toUpperCase() === n && (!posSide || p.posSide === posSide)
  );
}

async function pollPositions(symbol: string, category: string, posSide: string, expectGone = false, tries = 15): Promise<BitgetV3Position | undefined> {
  for (let i = 0; i < tries; i++) {
    try {
      const positions = await getPositionsV3(category);
      const found = findPos(positions, symbol, posSide);
      if (expectGone && !found) return undefined;
      if (!expectGone && found) return found;
    } catch {
      // transient query failure — keep polling
    }
    await sleep(700);
  }
  return expectGone ? undefined : undefined;
}

async function runToolRoundTrip() {
  console.log('\n\n========== Section 4: closePositionTool.execute end-to-end ==========');
  const { closePositionTool } = await import('../src/agent/tools/order-management');
  const btc = await getInstrument('BTCUSDT', 'usdt-futures');
  const qty = snapQtyToStep(0.01, btc);

  console.log('\n--- Open BTCUSDT market long (hedge) ---');
  const openRes = await placeOrderV3({ symbol: 'BTCUSDT', category: 'usdt-futures', side: 'buy', orderType: 'market', size: String(qty), posSide: 'long', marginMode: 'crossed' });
  console.log('open orderId:', openRes.orderId);
  await sleep(1200);

  console.log('\n--- Stage full close via closePositionTool ---');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const staged = (await (closePositionTool.execute as any)({ symbol: 'BTCUSDT', category: 'usdt-futures', sizePercent: 100 }, {})) as Record<string, any>;
  console.log(JSON.stringify({ success: staged.success, posSide: staged.posSide, marginMode: staged.marginMode, closeSide: staged.closeSide, closeSize: staged.closeSize }, null, 2));

  console.log('\n--- Execute the staged close (simulating /api/trade/action) ---');
  const closeRes = await closePositionsV3('BTCUSDT', 'usdt-futures', staged.closeSide as 'buy' | 'sell', staged.closeSize as string, staged.posSide as 'long' | 'short', staged.marginMode);
  console.log('close orderId:', closeRes.orderId);
  await sleep(1200);
  const gone = await pollPositions('BTCUSDT', 'USDT-FUTURES', 'long', true);
  console.log('position gone:', !gone);

  console.log('\n--- Tool guards ---');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noPos = (await (closePositionTool.execute as any)({ symbol: 'BTCUSDT', category: 'usdt-futures', sizePercent: 100 }, {})) as Record<string, any>;
  console.log('no-position guard:', JSON.stringify({ success: noPos.success, error: noPos.error }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spot = (await (closePositionTool.execute as any)({ symbol: 'RTSLAUSDT', category: 'spot', sizePercent: 100 }, {})) as Record<string, any>;
  console.log('spot guard:', JSON.stringify({ success: spot.success, error: spot.error }));
}

async function run() {
  console.log('Bitget UTA v3 Position-Close Probe');
  console.log('REST base       :', BITGET_REST_BASE);
  console.log('API key         :', maskKey());
  console.log('Demo trading    :', DEMO ? 'YES' : 'NO');

  console.log('\n\n========== Section 1: Raw endpoint behaviour (no real positions touched) ==========');

  const placeClose = {
    category: 'USDT-FUTURES',
    symbol: 'BTCUSDT',
    side: 'sell',
    orderType: 'market',
    qty: '0.001',
    posSide: 'long',
    marginMode: 'crossed',
    reduceOnly: 'YES',
  };

  await postProbe('hedge-mode close with NO open position', '/api/v3/trade/place-order', placeClose);
  await postProbe('hedge-mode close MISSING posSide', '/api/v3/trade/place-order', {
    category: 'USDT-FUTURES', symbol: 'BTCUSDT', side: 'sell', orderType: 'market', qty: '0.001',
  });
  await postProbe('qty not multiple of sizeMultiplier', '/api/v3/trade/place-order', {
    ...placeClose, qty: '0.00105',
  });
  await probeGet('current-position category=SPOT (known unsupported)', '/api/v3/position/current-position', 'category=SPOT');
  await postProbe('native close-positions no-position (BTCUSDT)', '/api/v3/trade/close-positions', {
    category: 'USDT-FUTURES', symbol: 'BTCUSDT', posSide: 'long',
  });
  await postProbe('native close-positions category=SPOT', '/api/v3/trade/close-positions', {
    category: 'SPOT',
  });

  console.log('\n\n========== Section 2: Current cached position state ==========');
  for (const cat of ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES']) {
    try {
      const positions = await getPositionsV3(cat);
      console.log(`${cat}: ${positions.length} position(s)`);
    } catch (err) {
      console.log(`${cat}: ERROR ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!DEMO) {
    console.log('\nBITGET_DEMO_TRADING != true — skipping write round-trip.');
    return;
  }

  console.log('\n\n========== Section 3: Demo write round-trip (ENABLED) ==========');

  const btc = await getInstrument('BTCUSDT', 'usdt-futures');
  const eth = await getInstrument('ETHUSDT', 'usdt-futures');
  const openQty = snapQtyToStep(0.01, btc);

  console.log('\n--- Opening market LONG on BTCUSDT (hedge) ---');
  const openRes = await placeOrderV3({ symbol: 'BTCUSDT', category: 'usdt-futures', side: 'buy', orderType: 'market', size: String(openQty), posSide: 'long', marginMode: 'crossed' });
  console.log('open orderId:', openRes.orderId);
  await sleep(1200);
  const pos = await pollPositions('BTCUSDT', 'USDT-FUTURES', 'long');
  if (!pos) {
    console.log('FAIL: position did not appear after open');
    return;
  }
  console.log('position:', { total: pos.total, posSide: pos.posSide, marginMode: pos.marginMode, avgPrice: pos.avgPrice, leverage: pos.leverage });

  console.log('\n--- Partial close 50% via closePositionsV3 (reduce-only path) ---');
  const half = snapQtyToStep((parseFloat(pos.total!) * 0.5), btc);
  console.log('half qty:', half);
  if (half >= parseFloat(btc.minTradeNum || '0.001')) {
    const halfRes = await closePositionsV3('BTCUSDT', 'usdt-futures', 'sell', String(half), 'long');
    console.log('partial close orderId:', halfRes.orderId);
    await sleep(1200);
    const after = await pollPositions('BTCUSDT', 'USDT-FUTURES', 'long');
    console.log('remaining after partial close:', after ? after.total : 'GONE');
  } else {
    console.log('partial close below minTradeNum — skipping partial, going straight to full close');
  }

  console.log('\n--- Full close via closePositionsV3 ---');
  const fullPos = (await pollPositions('BTCUSDT', 'USDT-FUTURES', 'long')) || pos;
  const fullQty = parseFloat(fullPos.total!);
  console.log('full qty:', fullQty);
  const closeRes = await closePositionsV3('BTCUSDT', 'usdt-futures', 'sell', String(fullQty), 'long');
  console.log('full close orderId:', closeRes.orderId);
  await sleep(1200);
  await pollPositions('BTCUSDT', 'USDT-FUTURES', 'long', true);
  const afterFull = await pollPositions('BTCUSDT', 'USDT-FUTURES', 'long', true);
  console.log('position gone after full close:', !afterFull);

  console.log('\n--- Audit close order via order-info ---');
  if (closeRes.orderId) {
    const info = await getOrderInfoV3('BTCUSDT', 'usdt-futures', closeRes.orderId);
    console.log(JSON.stringify(info && { status: info.status, size: info.size, avgPrice: info.avgPrice, posSide: info.posSide, reduceOnly: info.reduceOnly }, null, 2));
  }

  console.log('\n--- Native /close-positions comparison on ETHUSDT ---');
  const ethQty = snapQtyToStep(0.01, eth);
  const ethOpen = await placeOrderV3({ symbol: 'ETHUSDT', category: 'usdt-futures', side: 'buy', orderType: 'market', size: String(ethQty), posSide: 'long', marginMode: 'crossed' });
  console.log('eth open orderId:', ethOpen.orderId);
  await sleep(1200);
  const ethPos = await pollPositions('ETHUSDT', 'USDT-FUTURES', 'long');
  console.log('ETH position:', ethPos ? ethPos.total : 'MISSING');
  await postProbe('native close-positions ETHUSDT long', '/api/v3/trade/close-positions', {
    category: 'USDT-FUTURES', symbol: 'ETHUSDT', posSide: 'long',
  });
  await sleep(1200);
  const ethGone = await pollPositions('ETHUSDT', 'USDT-FUTURES', 'long', true);
  console.log('ETH position gone after native close:', !ethGone);

  console.log('\nProbe complete.');
  await runToolRoundTrip();
}

run().catch((err) => {
  console.error('Probe crashed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});