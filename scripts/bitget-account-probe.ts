/**
 * Bitget UTA v3 Account Endpoint Probe (READ-ONLY GETs only)
 *
 * Diagnoses the account endpoints used by the `get_account_overview` agent tool:
 *   - GET /api/v3/account/info              (no permission required)
 *   - GET /api/v3/account/settings          (UTA mgt. read)
 *   - GET /api/v3/account/assets            (UTA mgt. read)  — with & without undocumented ?category=
 *   - GET /api/v3/position/current-position (per category)
 *   - existing getAccountOverviewV3() paths to capture current behavior
 *
 * Run:  bun run scripts/bitget-account-probe.ts
 * Reads credentials from .env.local (Bun auto-loads it). No secrets are printed.
 */
import { BITGET_REST_BASE } from '../src/lib/bitget/rest';
import { getAuthHeaders } from '../src/lib/bitget/auth/signer';
import { getAccountOverviewV3, getPositionsV3 } from '../src/lib/bitget/trade';

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

async function probeCall(label: string, fn: () => Promise<unknown>) {
  const t0 = Date.now();
  try {
    const result = await fn();
    console.log(`\n=== ${label}  [OK ${Date.now() - t0}ms]`);
    console.log(JSON.stringify(result, null, 2)?.slice(0, 8000));
  } catch (err) {
    console.log(`\n=== ${label}  [THREW ${Date.now() - t0}ms]`);
    console.log(err instanceof Error ? err.message : String(err));
  }
  await sleep(250);
}

async function main() {
  console.log('Bitget UTA v3 Account Probe');
  console.log(`REST base       : ${BITGET_REST_BASE}`);
  console.log(`API key         : ${maskKey()}`);
  console.log(`Demo trading    : ${process.env.BITGET_DEMO_TRADING === 'true' ? 'YES (paptrading:1)' : 'NO (live)'}`);
  console.log('Keys present    :', {
    key: !!process.env.BITGET_API_KEY,
    secret: !!process.env.BITGET_API_SECRET,
    passphrase: !!process.env.BITGET_PASSPHRASE,
  });

  // 1. Identity + permission self-diagnosis (no permission needed to call)
  await probeGet('account/info (permissions self-check)', '/api/v3/account/info');
  await sleep(250);

  // 2. Account settings — per docs, NO query params
  await probeGet('account/settings (no query, per docs)', '/api/v3/account/settings');
  await sleep(250);

  // 3. Account assets — per docs, NO query params
  await probeGet('account/assets (no query, per docs)', '/api/v3/account/assets');
  await sleep(250);

  // 4. Account assets — current code sends undocumented ?category= (is it accepted/rejected?)
  await probeGet('account/assets ?category=USDT-FUTURES (current code behavior)', '/api/v3/account/assets', 'category=USDT-FUTURES');
  await sleep(250);
  await probeGet('account/assets ?category=SPOT', '/api/v3/account/assets', 'category=SPOT');
  await sleep(250);

  // 5. Positions — which categories does current-position accept?
  await probeGet('position/current-position ?category=USDT-FUTURES', '/api/v3/position/current-position', 'category=USDT-FUTURES');
  await sleep(250);
  await probeGet('position/current-position ?category=SPOT', '/api/v3/position/current-position', 'category=SPOT');
  await sleep(250);
  await probeGet('position/current-position ?category=COIN-FUTURES', '/api/v3/position/current-position', 'category=COIN-FUTURES');
  await sleep(250);
  await probeGet('position/current-position ?category=USDC-FUTURES', '/api/v3/position/current-position', 'category=USDC-FUTURES');
  await sleep(500);

  // 6. Existing code paths — capture current behavior / failure modes
  await probeCall('getPositionsV3(USDT-FUTURES)', () => getPositionsV3('USDT-FUTURES'));
  await probeCall('getAccountOverviewV3("all")', () => getAccountOverviewV3('all'));
  await probeCall('getAccountOverviewV3("usdt-futures")', () => getAccountOverviewV3('usdt-futures'));
  await probeCall('getAccountOverviewV3("spot")', () => getAccountOverviewV3('spot'));
  await probeCall('getAccountOverviewV3("coin-futures")', () => getAccountOverviewV3('coin-futures'));

  console.log('\nProbe complete.');
}

main().catch((err) => {
  console.error('Probe crashed:', err);
  process.exit(1);
});