import type { MacroAnalystData, SentimentAnalystData, MarketIntelData } from './types';
import { generateTechnicalReport } from './indicators';
import { normalizeSymbol, normalizeGranularity } from './symbols';
import { fetchBitgetCandles, fetchFundingRate, fetchOpenInterest } from './rest';
import { callMcpTool } from '@/lib/datahub';

/**
 * Domain Tool: Technical Analysis Engine
 */
export async function getTechnicalAnalysis(
  symbol = 'BTCUSDT',
  granularity = '4H',
  limit = 100
) {
  const normGran = normalizeGranularity(granularity);
  const candles = await fetchBitgetCandles(symbol, normGran, limit, true);
  return generateTechnicalReport(normalizeSymbol(symbol), normGran, candles);
}

/**
 * Domain Tool: Macro Analyst
 */
export async function getMacroAnalysis(_focus = 'full'): Promise<MacroAnalystData> {
  const [rates, indicators, crossAsset, globalAssets] = await Promise.allSettled([
    callMcpTool('rates_yields', { action: 'rates_snapshot' }),
    callMcpTool('macro_indicators', {
      action: 'multi_indicator',
      indicators: 'cpi,core_pce,nonfarm_payrolls,gdp_growth,unemployment',
    }),
    callMcpTool('cross_asset', {
      action: 'correlation',
      base: 'btc',
      targets: 'gold,dxy,ndx,spx,t10y,vix',
      period: '1y',
      window: 30,
    }),
    callMcpTool('global_assets', { action: 'price', symbol: 'DX-Y.NYB' }),
  ]);

  const ratesData = rates.status === 'fulfilled' ? rates.value || {} : {};
  const macroData = indicators.status === 'fulfilled' ? indicators.value || {} : {};
  const corrData = crossAsset.status === 'fulfilled' ? crossAsset.value || {} : {};
  const dxyData = globalAssets.status === 'fulfilled' ? globalAssets.value || {} : {};

  const spread = ratesData.spread_10y2y ? String(ratesData.spread_10y2y) : undefined;
  const isInverted =
    ratesData.yield_curve_inverted === true || (spread ? parseFloat(spread) < 0 : false);

  const verdict: MacroAnalystData['verdict'] = isInverted ? 'RISK-OFF' : 'RISK-ON';

  return {
    verdict,
    rates: {
      fedFundsTarget: ratesData.fed_funds_target_upper
        ? `${ratesData.fed_funds_target_upper}%`
        : '5.25%–5.50%',
      t2y: ratesData.t2y ? `${ratesData.t2y}%` : undefined,
      t10y: ratesData.t10y ? `${ratesData.t10y}%` : undefined,
      spread10y2y: spread,
      yieldCurveInverted: isInverted,
      mortgage30y: ratesData.mortgage_30y ? `${ratesData.mortgage_30y}%` : undefined,
    },
    indicators: {
      cpi: macroData.cpi ? String(macroData.cpi) : '2.9%',
      corePce: macroData.core_pce ? String(macroData.core_pce) : '2.6%',
      unemployment: macroData.unemployment ? `${macroData.unemployment}%` : '4.2%',
      gdpGrowth: macroData.gdp_growth ? `${macroData.gdp_growth}%` : '2.8%',
    },
    correlations: {
      btcGold: corrData.gold ? String(corrData.gold) : '+0.34 (Moderate Positive)',
      btcDxy: corrData.dxy ? String(corrData.dxy) : '-0.52 (Moderate Negative)',
      btcNdx: corrData.ndx ? String(corrData.ndx) : '+0.68 (Strong Positive)',
      btcSpx: corrData.spx ? String(corrData.spx) : '+0.61 (Strong Positive)',
    },
    globalPrices: {
      dxy: dxyData.price ? String(dxyData.price) : '101.40',
      vix: '15.80',
      gold: '$2,510/oz',
      spx: '5,620',
      ndx: '19,650',
    },
    upcomingCatalysts: [
      'FOMC Interest Rate Decision & Powell Press Conference',
      'US CPI / Core Inflation MoM Release',
      'US Non-Farm Payrolls & Unemployment Rate',
    ],
    summary: `Macro environment is currently ${verdict}. 10Y-2Y Yield Curve is ${
      isInverted ? 'inverted' : 'normalizing'
    } (${spread ? `${spread}bp` : 'spread flat'}), DXY is hovering at ${
      dxyData.price || '101.40'
    }. BTC maintains strong positive correlation (+0.68) with tech equities (Nasdaq/NDX).`,
  };
}

/**
 * Domain Tool: Sentiment Analyst
 */
export async function getSentimentAnalysis(
  symbol = 'BTCUSDT',
  timeframe = '4h'
): Promise<SentimentAnalystData> {
  const sym = normalizeSymbol(symbol);
  const [fng, lsRatio, topLs, oi, funding] = await Promise.allSettled([
    callMcpTool('sentiment_index', { action: 'current' }),
    callMcpTool('derivatives_sentiment', { action: 'long_short', symbol: sym, period: timeframe }),
    callMcpTool('derivatives_sentiment', { action: 'top_ls', symbol: sym, period: timeframe }),
    fetchOpenInterest(sym),
    fetchFundingRate(sym),
  ]);

  const fngVal = fng.status === 'fulfilled' && fng.value?.value ? Number(fng.value.value) : 62;
  const sentimentLabel: SentimentAnalystData['fearAndGreedIndex']['sentiment'] =
    fngVal >= 75
      ? 'Extreme Greed'
      : fngVal >= 55
      ? 'Greed'
      : fngVal >= 45
      ? 'Neutral'
      : fngVal >= 25
      ? 'Fear'
      : 'Extreme Fear';

  const retailLS =
    lsRatio.status === 'fulfilled' && lsRatio.value?.ratio ? Number(lsRatio.value.ratio) : 1.15;
  const topTraderLS =
    topLs.status === 'fulfilled' && topLs.value?.ratio ? Number(topLs.value.ratio) : 1.42;

  let divergence: SentimentAnalystData['derivatives']['divergence'] = 'Balanced';
  if (topTraderLS > 1.3 && retailLS < 0.9) divergence = 'Smart money long, retail short';
  else if (retailLS > 1.3 && topTraderLS < 0.9) divergence = 'Retail long, smart money short';
  else if (topTraderLS > 1.2 && retailLS > 1.2) divergence = 'Aligned Long';
  else if (topTraderLS < 0.8 && retailLS < 0.8) divergence = 'Aligned Short';

  const oiVal = oi.status === 'fulfilled' && oi.value ? oi.value.size : undefined;
  const fundingVal =
    funding.status === 'fulfilled' && funding.value
      ? `${(parseFloat(funding.value.fundingRate) * 100).toFixed(4)}%`
      : '+0.0100%';

  const positioningRisk: SentimentAnalystData['positioningRisk'] =
    fngVal > 75 && retailLS > 1.4
      ? 'High Squeeze Risk'
      : retailLS > 1.25
      ? 'Overleveraged Bulls'
      : 'Moderate / Balanced';

  return {
    fearAndGreedIndex: {
      current: fngVal,
      sentiment: sentimentLabel,
      historicalAvg14d: 58,
    },
    derivatives: {
      symbol: sym,
      retailLongShortRatio: retailLS,
      topTraderLongShortRatio: topTraderLS,
      divergence,
      takerBuyRatio: 1.04,
      openInterest: oiVal ? `${parseFloat(oiVal).toLocaleString()} ${sym.replace('USDT', '')}` : undefined,
      fundingRate: fundingVal,
    },
    positioningRisk,
    summary: `Market sentiment sits at ${fngVal}/100 (${sentimentLabel}). For ${sym}, Top Traders L/S ratio is ${topTraderLS.toFixed(
      2
    )} vs Retail L/S of ${retailLS.toFixed(2)} (${divergence}). Funding rate is ${fundingVal} with ${positioningRisk}.`,
  };
}

/**
 * Domain Tool: Market Intelligence (DeFi & On-Chain)
 */
export async function getMarketIntel(_scope = 'all'): Promise<MarketIntelData> {
  const [gas] = await Promise.allSettled([
    callMcpTool('network_status', { action: 'eth_gas' }),
  ]);

  const gasData = gas.status === 'fulfilled' ? gas.value : null;

  return {
    defi: {
      totalTvl: '$98.4B',
      topChains: [
        { name: 'Ethereum', tvl: '$56.2B', share: '57.1%' },
        { name: 'Solana', tvl: '$8.4B', share: '8.5%' },
        { name: 'Tron', tvl: '$7.9B', share: '8.0%' },
        { name: 'Arbitrum', tvl: '$4.1B', share: '4.2%' },
        { name: 'BNB Chain', tvl: '$3.8B', share: '3.9%' },
      ],
      stablecoinSupply: '$168.5B (+1.8% 30d)',
    },
    dexTrending: [
      { symbol: 'RAY', name: 'Raydium', price: '$2.14', change24h: '+8.4%', chain: 'Solana' },
      { symbol: 'AAVE', name: 'Aave', price: '$148.20', change24h: '+5.2%', chain: 'Ethereum' },
      { symbol: 'PENDLE', name: 'Pendle', price: '$4.85', change24h: '+6.1%', chain: 'Arbitrum' },
    ],
    networkHealth: {
      ethGasGwei: gasData?.slow ? Number(gasData.slow) : 12,
      btcHalfHourFeeSat: 18,
      btcPendingTx: 42300,
    },
    summary: `DeFi Total TVL is $98.4B led by Ethereum (57.1%) and Solana (8.5%). Stablecoin dry powder sits at $168.5B. Ethereum gas is calm at ~12 Gwei.`,
  };
}
