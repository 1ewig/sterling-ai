import type { KlineCandle } from './types';
import type { TechnicalIndicatorReport } from '@/agent/types';

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    const slice = values.slice(i - period + 1, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(values: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  let prevEMA = NaN;

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    if (isNaN(prevEMA)) {
      const initialSMA = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
      prevEMA = initialSMA;
      result.push(initialSMA);
    } else {
      const currentEMA = (values[i] - prevEMA) * multiplier + prevEMA;
      prevEMA = currentEMA;
      result.push(currentEMA);
    }
  }
  return result;
}

/**
 * Calculates Relative Strength Index (RSI)
 */
export function calculateRSI(closes: number[], period = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }

  const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  result.push(NaN); // For index 0
  for (let i = 0; i < period - 1; i++) {
    result.push(NaN);
  }

  const initialRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - 100 / (1 + initialRS));

  let rollingGain = avgGain;
  let rollingLoss = avgLoss;

  for (let i = period; i < gains.length; i++) {
    rollingGain = (rollingGain * (period - 1) + gains[i]) / period;
    rollingLoss = (rollingLoss * (period - 1) + losses[i]) / period;

    if (rollingLoss === 0) {
      result.push(100);
    } else {
      const rs = rollingGain / rollingLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }

  return result;
}

/**
 * Calculates MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): { dif: number[]; dea: number[]; hist: number[] } {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const dif: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      dif.push(NaN);
    } else {
      dif.push(fastEMA[i] - slowEMA[i]);
    }
  }

  // DEA is EMA of DIF
  const validDifIdx = dif.findIndex((v) => !isNaN(v));
  const validDif = validDifIdx >= 0 ? dif.slice(validDifIdx) : [];
  const deaRaw = calculateEMA(validDif, signalPeriod);

  const dea: number[] = Array.from({ length: validDifIdx }, () => NaN).concat(deaRaw);
  const hist: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (isNaN(dif[i]) || isNaN(dea[i])) {
      hist.push(NaN);
    } else {
      hist.push((dif[i] - dea[i]) * 2);
    }
  }

  return { dif, dea, hist };
}

/**
 * Calculates Average True Range (ATR)
 */
export function calculateATR(candles: KlineCandle[], period = 14): number[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
      continue;
    }
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;
    const prevClose = candles[i - 1].close;

    const trVal = Math.max(
      currentHigh - currentLow,
      Math.abs(currentHigh - prevClose),
      Math.abs(currentLow - prevClose)
    );
    tr.push(trVal);
  }

  return calculateSMA(tr, period);
}

/**
 * Calculates Bollinger Bands
 */
export function calculateBollingerBands(
  closes: number[],
  period = 20,
  stdDevMultiplier = 2
): { upper: number[]; middle: number[]; lower: number[]; bandwidth: number[] } {
  const middle = calculateSMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  const bandwidth: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (isNaN(middle[i])) {
      upper.push(NaN);
      lower.push(NaN);
      bandwidth.push(NaN);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    const u = mean + stdDevMultiplier * stdDev;
    const l = mean - stdDevMultiplier * stdDev;
    upper.push(u);
    lower.push(l);
    bandwidth.push(mean > 0 ? ((u - l) / mean) * 100 : 0);
  }

  return { upper, middle, lower, bandwidth };
}

/**
 * Calculates Fibonacci Retracement Levels based on lookback window
 */
export function calculateFibonacci(candles: KlineCandle[]): {
  high: number;
  low: number;
  fib236: number;
  fib382: number;
  fib500: number;
  fib618: number;
  fib786: number;
} {
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);
  const diff = maxHigh - minLow;

  return {
    high: maxHigh,
    low: minLow,
    fib236: maxHigh - diff * 0.236,
    fib382: maxHigh - diff * 0.382,
    fib500: maxHigh - diff * 0.5,
    fib618: maxHigh - diff * 0.618,
    fib786: maxHigh - diff * 0.786,
  };
}

/**
 * Generates a full technical analysis report for given candlestick series
 */
export function generateTechnicalReport(
  symbol: string,
  granularity: string,
  candles: KlineCandle[]
): TechnicalIndicatorReport {
  if (!candles || candles.length < 10) {
    throw new Error(`Insufficient candlestick data for ${symbol}: received ${candles?.length ?? 0} bars (minimum 10 required)`);
  }

  const closes = candles.map((c) => c.close);
  const lastBar = candles[candles.length - 1];
  const currentPrice = lastBar.close;

  // Indicators: RSI with adaptive period for short histories
  const rsiPeriod = Math.min(14, Math.max(2, closes.length - 1));
  const rsiSeries = calculateRSI(closes, rsiPeriod);
  const rawRSI = rsiSeries[rsiSeries.length - 1];
  const lastRSI = !isNaN(rawRSI) ? Number(rawRSI.toFixed(2)) : 50;
  const rsiSignal = lastRSI >= 70 ? 'overbought' : lastRSI <= 30 ? 'oversold' : 'neutral';

  // MACD: adaptive fast/slow/signal for shorter windows
  const slowPeriod = Math.min(26, Math.max(4, closes.length - 1));
  const fastPeriod = Math.max(2, Math.floor(slowPeriod / 2));
  const signalPeriod = Math.min(9, Math.max(2, Math.floor(fastPeriod / 2)));
  const { dif, dea, hist } = calculateMACD(closes, fastPeriod, slowPeriod, signalPeriod);

  const rawDIF = dif.length > 0 ? dif[dif.length - 1] : NaN;
  const rawDEA = dea.length > 0 ? dea[dea.length - 1] : NaN;
  const rawHist = hist.length > 0 ? hist[hist.length - 1] : NaN;
  const rawPrevHist = hist.length > 1 ? hist[hist.length - 2] : NaN;

  const lastDIF = !isNaN(rawDIF) ? Number(rawDIF.toFixed(4)) : 0;
  const lastDEA = !isNaN(rawDEA) ? Number(rawDEA.toFixed(4)) : lastDIF;
  const lastHist = !isNaN(rawHist) ? Number(rawHist.toFixed(4)) : 0;
  const prevHist = !isNaN(rawPrevHist) ? Number(rawPrevHist.toFixed(4)) : 0;

  let macdSignal: TechnicalIndicatorReport['indicators']['macd']['signal'] = 'neutral';
  if (lastHist > 0 && prevHist <= 0) macdSignal = 'bullish_cross';
  else if (lastHist < 0 && prevHist >= 0) macdSignal = 'bearish_cross';
  else if (lastHist > 0) macdSignal = 'bullish_momentum';
  else if (lastHist < 0) macdSignal = 'bearish_momentum';

  // EMAs with adaptive length fallback
  const ema20 = calculateEMA(closes, Math.min(20, closes.length));
  const ema50 = calculateEMA(closes, Math.min(50, closes.length));
  const ema200 = closes.length >= 200 ? calculateEMA(closes, 200) : undefined;

  const rawEMA20 = ema20[ema20.length - 1];
  const rawEMA50 = ema50[ema50.length - 1];
  const lastEMA20 = !isNaN(rawEMA20) ? Number(rawEMA20.toFixed(2)) : currentPrice;
  const lastEMA50 = !isNaN(rawEMA50) ? Number(rawEMA50.toFixed(2)) : lastEMA20;
  const lastEMA200 = ema200 && !isNaN(ema200[ema200.length - 1]) ? Number(ema200[ema200.length - 1].toFixed(2)) : undefined;

  let emaAlignment: 'bullish' | 'bearish' | 'mixed' = 'mixed';
  if (currentPrice > lastEMA20 && lastEMA20 > lastEMA50) {
    emaAlignment = 'bullish';
  } else if (currentPrice < lastEMA20 && lastEMA20 < lastEMA50) {
    emaAlignment = 'bearish';
  }

  // Bollinger Bands
  const bbPeriod = Math.min(20, closes.length);
  const { upper, middle, lower, bandwidth } = calculateBollingerBands(closes, bbPeriod, 2);
  const rawUpper = upper[upper.length - 1];
  const rawMiddle = middle[middle.length - 1];
  const rawLower = lower[lower.length - 1];
  const rawBandwidth = bandwidth[bandwidth.length - 1];

  const lastUpper = !isNaN(rawUpper) ? Number(rawUpper.toFixed(2)) : currentPrice;
  const lastMiddle = !isNaN(rawMiddle) ? Number(rawMiddle.toFixed(2)) : currentPrice;
  const lastLower = !isNaN(rawLower) ? Number(rawLower.toFixed(2)) : currentPrice;
  const lastBandwidth = !isNaN(rawBandwidth) ? Number(rawBandwidth.toFixed(2)) : 0;

  const bbPosition =
    currentPrice >= lastUpper ? 'above_upper' : currentPrice <= lastLower ? 'below_lower' : 'inside';

  // ATR with adaptive period
  const atrPeriod = Math.min(14, Math.max(2, candles.length - 1));
  const atrSeries = calculateATR(candles, atrPeriod);
  const rawATR = atrSeries[atrSeries.length - 1];
  const lastATR = !isNaN(rawATR) ? Number(rawATR.toFixed(2)) : Number((lastBar.high - lastBar.low).toFixed(2));

  const fib = calculateFibonacci(candles);

  let fibZone = 'Mid-range (0.382–0.618)';
  if (currentPrice > fib.fib236) fibZone = 'Peak Extension (> 0.236)';
  else if (currentPrice < fib.fib786) fibZone = 'Deep Discount (< 0.786)';
  else if (currentPrice >= fib.fib618 && currentPrice <= fib.fib500) fibZone = 'Golden Pocket (0.500–0.618)';

  // Overall Trend determination
  let bullishPoints = 0;
  let bearishPoints = 0;

  if (lastRSI > 50) bullishPoints++;
  else bearishPoints++;

  if (lastDIF > lastDEA) bullishPoints += 1.5;
  else bearishPoints += 1.5;

  if (emaAlignment === 'bullish') bullishPoints += 2;
  else if (emaAlignment === 'bearish') bearishPoints += 2;

  if (currentPrice > lastMiddle) bullishPoints++;
  else bearishPoints++;

  const overallTrend: 'bullish' | 'bearish' | 'neutral' =
    bullishPoints > bearishPoints + 1 ? 'bullish' : bearishPoints > bullishPoints + 1 ? 'bearish' : 'neutral';

  const summary = `Overall ${overallTrend.toUpperCase()} setup on ${granularity}. RSI(14) is at ${lastRSI} (${rsiSignal}), MACD histogram is ${lastHist > 0 ? '+' : ''}${lastHist} (${macdSignal.replace('_', ' ')}), price is trading ${currentPrice > lastEMA20 ? 'above' : 'below'} 20-EMA ($${lastEMA20}) and located in the ${fibZone}.`;

  return {
    symbol,
    granularity,
    currentPrice,
    trend: overallTrend,
    indicators: {
      rsi14: lastRSI,
      rsiSignal,
      macd: {
        dif: lastDIF,
        dea: lastDEA,
        hist: lastHist,
        signal: macdSignal,
      },
      ema: {
        ema20: lastEMA20,
        ema50: lastEMA50,
        ema200: lastEMA200,
        alignment: emaAlignment,
      },
      bollingerBands: {
        upper: lastUpper,
        middle: lastMiddle,
        lower: lastLower,
        bandwidth: lastBandwidth,
        position: bbPosition,
      },
      superTrend: {
        value: Number((currentPrice - lastATR * 2).toFixed(2)),
        direction: overallTrend === 'bearish' ? 'bearish' : 'bullish',
      },
      fibonacci: {
        high: Number(fib.high.toFixed(2)),
        low: Number(fib.low.toFixed(2)),
        fib236: Number(fib.fib236.toFixed(2)),
        fib382: Number(fib.fib382.toFixed(2)),
        fib500: Number(fib.fib500.toFixed(2)),
        fib618: Number(fib.fib618.toFixed(2)),
        fib786: Number(fib.fib786.toFixed(2)),
        currentZone: fibZone,
      },
      atr14: lastATR,
    },
    summary,
  };
}
