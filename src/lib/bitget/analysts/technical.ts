import { generateTechnicalReport } from '../indicators';
import { normalizeSymbol, normalizeGranularity } from '../symbols';
import { fetchBitgetCandles } from '../rest';
import { DEFAULT_SYMBOL } from '../constants';
import type { TechnicalIndicatorReport } from '@/agent/types';

/**
 * Domain Tool: Technical Analysis Engine
 */
export async function getTechnicalAnalysis(
  symbol = DEFAULT_SYMBOL,
  granularity = '4H',
  limit = 100
): Promise<TechnicalIndicatorReport> {
  const normGran = normalizeGranularity(granularity);
  const candles = await fetchBitgetCandles(symbol, normGran, limit, true);
  return generateTechnicalReport(normalizeSymbol(symbol), normGran, candles);
}
