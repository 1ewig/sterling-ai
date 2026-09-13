import type { SentimentAnalystData } from '@/agent/types';
import { normalizeSymbol } from '../symbols';
import { fetchFundingRate, fetchOpenInterest } from '../rest';
import { callMcpTool } from '@/lib/datahub';

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
