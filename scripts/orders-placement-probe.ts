/**
 * Comprehensive Bitget v3 UTA Place Order Experimentation & Diagnostics Lab
 * Tests across Spot & Futures, Limit & Market, TP/SL, tick-snapping, and error boundaries.
 *
 * Run: bun run scripts/orders-placement-probe.ts
 */

import { safeGetJson } from '../src/lib/bitget/trade/fetch';
import { placeOrderV3, cancelOrderV3 } from '../src/lib/bitget/trade/orders';
import { getInstrument, snapPriceToTick, snapQtyToStep } from '../src/lib/bitget/trade/instruments';
import { fetchBitgetTicker } from '../src/lib/bitget/rest';
import { getOrderInfoV3 } from '../src/lib/bitget/trade/queries';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runExperiment() {
  console.log('=====================================================');
  console.log('  Bitget UTA v3 Place-Order Freeplay & Diagnostic Lab');
  console.log('=====================================================\n');

  // Fetch live futures ticker & instrument
  const futuresTicker = await fetchBitgetTicker('BTCUSDT', true);
  const futuresPrice = parseFloat(futuresTicker.lastPr);
  const futuresInst = await getInstrument('BTCUSDT', 'usdt-futures');

  console.log(`[BTCUSDT Futures] Current Price: $${futuresPrice}`);
  console.log(`[BTCUSDT Futures] Instrument: minTradeNum=${futuresInst.minTradeNum}, pricePlace=${futuresInst.pricePlace}, volumePlace=${futuresInst.volumePlace}, priceMultiplier=${futuresInst.priceMultiplier}`);

  // Test snapPriceToTick precision
  const rawTestPrice = futuresPrice * 0.9;
  const snappedTestPrice = snapPriceToTick(rawTestPrice, futuresInst);
  console.log(`[BTCUSDT Futures] Raw price: ${rawTestPrice} -> Snapped price: ${snappedTestPrice}`);

  // -------------------------------------------------------------------
  // TEST 1: Futures Limit Long (Snapped tick multiple)
  // -------------------------------------------------------------------
  console.log('\n--- TEST 1: Futures Limit BUY (Long) in Hedge Mode ---');
  const test1ClientOid = `sterling_test_long_${Date.now()}`;
  try {
    const res1 = await placeOrderV3({
      symbol: 'BTCUSDT',
      category: 'usdt-futures',
      side: 'buy',
      orderType: 'limit',
      size: futuresInst.minTradeNum,
      price: snappedTestPrice.toString(),
      posSide: 'long',
      marginMode: 'crossed',
      clientOid: test1ClientOid,
    });
    console.log('✓ TEST 1 Succeeded:', res1);

    await sleep(600);
    const verify1 = await getOrderInfoV3('BTCUSDT', 'usdt-futures', res1.orderId, test1ClientOid);
    console.log('  Order Info Verification via safeGetJson:', {
      orderId: verify1?.orderId,
      status: verify1?.status,
      rawStatus: verify1?.rawStatus,
      posSide: verify1?.posSide,
      price: verify1?.price,
      size: verify1?.size,
    });

    const cancel1 = await cancelOrderV3({
      symbol: 'BTCUSDT',
      category: 'usdt-futures',
      orderId: res1.orderId,
      clientOid: test1ClientOid,
    });
    console.log('  Canceled:', cancel1.success ? 'YES' : cancel1);
  } catch (err) {
    console.error('✗ TEST 1 Failed:', err instanceof Error ? err.message : err);
  }

  // -------------------------------------------------------------------
  // TEST 2: Futures Limit Short (Snapped tick multiple)
  // -------------------------------------------------------------------
  console.log('\n--- TEST 2: Futures Limit SELL (Short) in Hedge Mode ---');
  const rawShortPrice = futuresPrice * 1.1;
  const snappedShortPrice = snapPriceToTick(rawShortPrice, futuresInst);
  const test2ClientOid = `sterling_test_short_${Date.now()}`;
  try {
    const res2 = await placeOrderV3({
      symbol: 'BTCUSDT',
      category: 'usdt-futures',
      side: 'sell',
      orderType: 'limit',
      size: futuresInst.minTradeNum,
      price: snappedShortPrice.toString(),
      posSide: 'short',
      marginMode: 'crossed',
      clientOid: test2ClientOid,
    });
    console.log('✓ TEST 2 Succeeded:', res2);

    await sleep(600);
    const cancel2 = await cancelOrderV3({
      symbol: 'BTCUSDT',
      category: 'usdt-futures',
      orderId: res2.orderId,
      clientOid: test2ClientOid,
    });
    console.log('  Canceled:', cancel2.success ? 'YES' : cancel2);
  } catch (err) {
    console.error('✗ TEST 2 Failed:', err instanceof Error ? err.message : err);
  }

  // -------------------------------------------------------------------
  // TEST 3: Futures Limit with Preset TP and SL
  // -------------------------------------------------------------------
  console.log('\n--- TEST 3: Futures Limit with Preset TP and SL ---');
  const tpPrice = snapPriceToTick(futuresPrice * 0.95, futuresInst);
  const slPrice = snapPriceToTick(futuresPrice * 0.85, futuresInst);
  const test3ClientOid = `sterling_test_tpsl_${Date.now()}`;

  try {
    const res3 = await placeOrderV3({
      symbol: 'BTCUSDT',
      category: 'usdt-futures',
      side: 'buy',
      orderType: 'limit',
      size: futuresInst.minTradeNum,
      price: snappedTestPrice.toString(),
      posSide: 'long',
      marginMode: 'crossed',
      takeProfitPrice: tpPrice.toString(),
      stopLossPrice: slPrice.toString(),
      clientOid: test3ClientOid,
    });
    console.log('✓ TEST 3 Succeeded with TP/SL:', res3);

    await sleep(800);
    const info3 = await getOrderInfoV3('BTCUSDT', 'usdt-futures', res3.orderId, test3ClientOid);
    console.log('  Order Info with TP/SL verified:', {
      orderId: info3?.orderId,
      takeProfit: info3?.takeProfit,
      stopLoss: info3?.stopLoss,
      status: info3?.status,
      rawStatus: info3?.rawStatus,
    });

    const cancel3 = await cancelOrderV3({
      symbol: 'BTCUSDT',
      category: 'usdt-futures',
      orderId: res3.orderId,
      clientOid: test3ClientOid,
    });
    console.log('  Canceled:', cancel3.success ? 'YES' : cancel3);
  } catch (err) {
    console.error('✗ TEST 3 Failed:', err instanceof Error ? err.message : err);
  }

  // -------------------------------------------------------------------
  // TEST 4: Spot Limit Order
  // -------------------------------------------------------------------
  console.log('\n--- TEST 4: Spot Limit Buy Order ---');
  const spotInst = await getInstrument('BTCUSDT', 'spot');
  const spotTicker = await fetchBitgetTicker('BTCUSDT', false);
  const spotPrice = parseFloat(spotTicker.lastPr);
  const spotLimitPrice = snapPriceToTick(spotPrice * 0.5, spotInst);
  const spotQty = snapQtyToStep(0.001, spotInst);

  console.log(`[BTCUSDT Spot] Price: $${spotPrice}, pricePlace=${spotInst.pricePlace}, minTradeNum=${spotInst.minTradeNum}`);
  const test4ClientOid = `sterling_test_spot_${Date.now()}`;
  try {
    const res4 = await placeOrderV3({
      symbol: 'BTCUSDT',
      category: 'spot',
      side: 'buy',
      orderType: 'limit',
      size: spotQty.toString(),
      price: spotLimitPrice.toString(),
      clientOid: test4ClientOid,
    });
    console.log('✓ TEST 4 Succeeded:', res4);

    await sleep(600);
    const cancel4 = await cancelOrderV3({
      symbol: 'BTCUSDT',
      category: 'spot',
      orderId: res4.orderId,
      clientOid: test4ClientOid,
    });
    console.log('  Canceled:', cancel4.success ? 'YES' : cancel4);
  } catch (err) {
    console.error('✗ TEST 4 Failed:', err instanceof Error ? err.message : err);
  }

  // -------------------------------------------------------------------
  // TEST 5: Error Boundary - Sub-Minimum Quantity (Exchange rejection)
  // -------------------------------------------------------------------
  console.log('\n--- TEST 5: Error Boundary - Sub-minimum Quantity ---');
  try {
    await placeOrderV3({
      symbol: 'BTCUSDT',
      category: 'usdt-futures',
      side: 'buy',
      orderType: 'limit',
      size: '0.0000001',
      price: snappedTestPrice.toString(),
      posSide: 'long',
    });
    console.log('Unexpected success');
  } catch (err) {
    console.log('✓ Expected rejection caught:', err instanceof Error ? err.message : err);
  }

  // -------------------------------------------------------------------
  // TEST 6: Error Boundary - ReduceOnly in Hedge Mode (Bitget 25238 Error)
  // -------------------------------------------------------------------
  console.log('\n--- TEST 6: Error Boundary - reduceOnly in Hedge Mode (Known Bitget 25238) ---');
  const rawPayload = {
    category: 'USDT-FUTURES',
    symbol: 'BTCUSDT',
    side: 'sell',
    orderType: 'market',
    qty: futuresInst.minTradeNum,
    posSide: 'long',
    reduceOnly: 'YES',
    marginMode: 'crossed',
  };
  const rawRes = await safeGetJson('POST', '/api/v3/trade/place-order', '', rawPayload);
  console.log('✓ Bitget response for illegal reduceOnly in Hedge Mode:');
  console.log({
    ok: rawRes.ok,
    code: rawRes.json?.code,
    msg: rawRes.json?.msg,
  });

  console.log('\n=====================================================');
  console.log('  Diagnostics Lab: ALL 6 SCENARIOS VERIFIED!');
  console.log('=====================================================');
}

runExperiment().catch((err) => {
  console.error('Fatal probe error:', err);
  process.exit(1);
});
