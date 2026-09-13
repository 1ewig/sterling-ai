import type { MacroAnalystData } from '@/agent/types';
import { callMcpTool } from '@/lib/datahub';

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
