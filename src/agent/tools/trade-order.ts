import { tool } from 'ai';
import { stageTradeOrderParamsSchema } from '@/lib/bitget/types';
import { fetchBitgetTicker } from '@/lib/bitget/rest';
import {
  normalizeSymbol,
  getInstrument,
  snapPriceToTick,
  snapQtyToStep,
  validateOrderConstraints,
  getTierMmr,
  createTradeTicketToken,
} from '@/lib/bitget/trade';

export const stageTradeOrderTool = tool({
  description:
    'MANDATORY TRADING TOOL: Construct and stage an institutional HMAC-signed trade ticket for Bitget v3 UTA (Spot, USDT-Futures, or tokenized US equity rTokens like RTSLA). Calculates notional value, required margin, estimated liquidation, and risk-reward ratio. You MUST invoke this tool whenever the user asks to stage, place, enter, open, buy, sell, go long, go short, or set limit/market orders. Never output simulated trade tickets in text without calling this tool.',
  inputSchema: stageTradeOrderParamsSchema,
  execute: async ({
    symbol,
    category,
    side,
    orderType,
    size,
    price,
    tradeSide,
    leverage = 5,
    stopLossPrice,
    takeProfitPrice,
    rationale,
  }) => {
    const sym = normalizeSymbol(symbol);
    const isFutures = category !== 'spot';
    const normalizedSide: 'buy' | 'sell' = side === 'long' ? 'buy' : side === 'short' ? 'sell' : side;

    try {
      // 1. Fetch instrument precision metadata
      const instrument = await getInstrument(sym, category);
      const isSpotMarketBuy = category === 'spot' && normalizedSide === 'buy' && orderType === 'market';

      // 2. Fetch live market price for sanity and margin checks
      let livePrice = price || 0;
      try {
        const ticker = await fetchBitgetTicker(sym, isFutures);
        livePrice = parseFloat(ticker.lastPr) || livePrice;
      } catch {
        // Fallback to limit price if ticker lookup fails
      }

      const rawExecutionPrice = orderType === 'market' ? livePrice : (price || livePrice);
      if (rawExecutionPrice <= 0) {
        return {
          success: false,
          error: `Invalid execution price for ${sym}. Limit orders require a valid positive price.`,
          requestedSymbol: symbol,
          normalizedSymbol: sym,
          actionableGuidance: 'Please specify a positive price or use orderType="market" to execute at current best ask/bid.',
        };
      }

      // 3. Snap execution price and size to exchange instrument step constraints
      const executionPrice = snapPriceToTick(rawExecutionPrice, instrument);
      const executionSize = snapQtyToStep(size, instrument);

      // 4. Validate order constraints
      const validation = validateOrderConstraints(
        {
          symbol: sym,
          orderType,
          side: normalizedSide,
          size: executionSize,
          price: executionPrice,
          livePrice,
          leverage,
          isSpotMarketBuy,
        },
        instrument
      );

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          requestedSymbol: symbol,
          normalizedSymbol: sym,
          actionableGuidance: 'Adjust order size or leverage to meet instrument rules.',
        };
      }

      const notionalUsdt = executionSize * executionPrice;
      const effectiveLeverage = isFutures ? Math.max(1, leverage) : 1;
      const initialMarginUsdt = notionalUsdt / effectiveLeverage;

      // 5. Compute approximate liquidation baseline using dynamic tiered MMR
      let estimatedLiquidation: number | undefined;
      const tierMmr = isFutures ? getTierMmr(sym, notionalUsdt) : 0;

      if (isFutures && effectiveLeverage > 1) {
        if (normalizedSide === 'buy') {
          estimatedLiquidation = executionPrice * (1 - 1 / effectiveLeverage + tierMmr);
        } else {
          estimatedLiquidation = executionPrice * (1 + 1 / effectiveLeverage - tierMmr);
        }
      }

      // 6. Compute Risk/Reward and validate SL/TP orientation
      let riskRewardRatio: string | undefined;
      const warnings: string[] = [];

      const snappedStopLoss = stopLossPrice ? snapPriceToTick(stopLossPrice, instrument) : undefined;
      const snappedTakeProfit = takeProfitPrice ? snapPriceToTick(takeProfitPrice, instrument) : undefined;

      if (snappedStopLoss && normalizedSide === 'buy' && snappedStopLoss >= executionPrice) {
        warnings.push(`Stop Loss ($${snappedStopLoss}) is above execution price ($${executionPrice}) on a BUY order.`);
      } else if (snappedStopLoss && normalizedSide === 'sell' && snappedStopLoss <= executionPrice) {
        warnings.push(`Stop Loss ($${snappedStopLoss}) is below execution price ($${executionPrice}) on a SELL order.`);
      }

      if (snappedTakeProfit && normalizedSide === 'buy' && snappedTakeProfit <= executionPrice) {
        warnings.push(`Take Profit ($${snappedTakeProfit}) is below execution price ($${executionPrice}) on a BUY order.`);
      } else if (snappedTakeProfit && normalizedSide === 'sell' && snappedTakeProfit >= executionPrice) {
        warnings.push(`Take Profit ($${snappedTakeProfit}) is above execution price ($${executionPrice}) on a SELL order.`);
      }

      if (snappedStopLoss && snappedTakeProfit) {
        const risk = Math.abs(executionPrice - snappedStopLoss);
        const reward = Math.abs(snappedTakeProfit - executionPrice);
        if (risk > 0) {
          riskRewardRatio = `1:${(reward / risk).toFixed(2)}`;
        }
      }

      const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const clientOid = `sterling_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 7. Cryptographically seal ticket parameters into an HMAC token
      const ticketToken = createTradeTicketToken({
        ticketId,
        symbol: sym,
        category,
        side: normalizedSide,
        orderType,
        size: executionSize,
        price: executionPrice,
        tradeSide,
        leverage: isFutures ? effectiveLeverage : 1,
        stopLossPrice: snappedStopLoss,
        takeProfitPrice: snappedTakeProfit,
        clientOid,
        timestamp: Date.now(),
      });

      return {
        success: true,
        ticketId,
        ticketToken,
        clientOid,
        symbol: sym,
        category,
        side: normalizedSide,
        orderType,
        size: executionSize,
        price: executionPrice,
        tradeSide,
        leverage: isFutures ? effectiveLeverage : 1,
        notionalUsdt: parseFloat(notionalUsdt.toFixed(2)),
        initialMarginUsdt: parseFloat(initialMarginUsdt.toFixed(2)),
        estimatedLiquidation: estimatedLiquidation ? parseFloat(estimatedLiquidation.toFixed(2)) : undefined,
        tierMmrPercent: isFutures ? `${(tierMmr * 100).toFixed(2)}%` : undefined,
        stopLossPrice: snappedStopLoss,
        takeProfitPrice: snappedTakeProfit,
        riskRewardRatio,
        warnings: warnings.length > 0 ? warnings : undefined,
        rationale: rationale || `Algorithmic ${normalizedSide.toUpperCase()} setup on ${sym} (${category})`,
        status: 'staged_pending_user_confirmation',
        actionableGuidance:
          warnings.length > 0
            ? `Trade Ticket ${ticketId} staged with risk warnings: ${warnings.join(' ')} Review before confirming.`
            : `Trade Ticket ${ticketId} staged successfully with tick precision. Review parameters and confirm to submit order.`,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : `Failed to stage trade order for ${symbol}.`,
        requestedSymbol: symbol,
        normalizedSymbol: sym,
      };
    }
  },
});
