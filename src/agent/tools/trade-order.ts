import { tool } from 'ai';
import { stageTradeOrderParamsSchema } from '@/lib/bitget/types';
import { fetchBitgetTicker, normalizeSymbol } from '@/lib/bitget/client';

export const stageTradeOrderTool = tool({
  description:
    'Stage an institutional trade order ticket for Bitget v3 Unified Trading Account (Spot, USDT-Futures, or tokenized US equity rTokens like RTSLA). Calculates notional value, required margin, estimated liquidation, and risk-reward ratio before user confirmation.',
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
      // 1. Fetch live market price for sanity and margin checks
      let livePrice = price || 0;
      try {
        const ticker = await fetchBitgetTicker(sym, isFutures);
        livePrice = parseFloat(ticker.lastPr) || livePrice;
      } catch {
        // Fallback to limit price if ticker lookup fails
      }

      const executionPrice = orderType === 'market' ? livePrice : (price || livePrice);
      if (executionPrice <= 0) {
        return {
          success: false,
          error: `Invalid execution price for ${sym}. Limit orders require a valid positive price.`,
          requestedSymbol: symbol,
          normalizedSymbol: sym,
          actionableGuidance: 'Please specify a positive price or use orderType="market" to execute at current best ask/bid.',
        };
      }

      const notionalUsdt = size * executionPrice;
      const effectiveLeverage = isFutures ? Math.max(1, leverage) : 1;
      const initialMarginUsdt = notionalUsdt / effectiveLeverage;

      // 2. Compute approximate liquidation baseline for futures
      let estimatedLiquidation: number | undefined;
      if (isFutures && effectiveLeverage > 1) {
        const maintenanceMarginRate = 0.005; // 0.5% base MMR
        if (normalizedSide === 'buy') {
          estimatedLiquidation = executionPrice * (1 - 1 / effectiveLeverage + maintenanceMarginRate);
        } else {
          estimatedLiquidation = executionPrice * (1 + 1 / effectiveLeverage - maintenanceMarginRate);
        }
      }

      // 3. Compute Risk/Reward and validate SL/TP orientation
      let riskRewardRatio: string | undefined;
      const warnings: string[] = [];

      if (stopLossPrice && normalizedSide === 'buy' && stopLossPrice >= executionPrice) {
        warnings.push(`Stop Loss ($${stopLossPrice}) is above execution price ($${executionPrice}) on a BUY order.`);
      } else if (stopLossPrice && normalizedSide === 'sell' && stopLossPrice <= executionPrice) {
        warnings.push(`Stop Loss ($${stopLossPrice}) is below execution price ($${executionPrice}) on a SELL order.`);
      }

      if (takeProfitPrice && normalizedSide === 'buy' && takeProfitPrice <= executionPrice) {
        warnings.push(`Take Profit ($${takeProfitPrice}) is below execution price ($${executionPrice}) on a BUY order.`);
      } else if (takeProfitPrice && normalizedSide === 'sell' && takeProfitPrice >= executionPrice) {
        warnings.push(`Take Profit ($${takeProfitPrice}) is above execution price ($${executionPrice}) on a SELL order.`);
      }

      if (stopLossPrice && takeProfitPrice) {
        const risk = Math.abs(executionPrice - stopLossPrice);
        const reward = Math.abs(takeProfitPrice - executionPrice);
        if (risk > 0) {
          riskRewardRatio = `1:${(reward / risk).toFixed(2)}`;
        }
      }

      const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      return {
        success: true,
        ticketId,
        symbol: sym,
        category,
        side: normalizedSide,
        orderType,
        size,
        price: parseFloat(executionPrice.toFixed(4)),
        tradeSide,
        leverage: isFutures ? effectiveLeverage : 1,
        notionalUsdt: parseFloat(notionalUsdt.toFixed(2)),
        initialMarginUsdt: parseFloat(initialMarginUsdt.toFixed(2)),
        estimatedLiquidation: estimatedLiquidation ? parseFloat(estimatedLiquidation.toFixed(2)) : undefined,
        stopLossPrice,
        takeProfitPrice,
        riskRewardRatio,
        warnings: warnings.length > 0 ? warnings : undefined,
        rationale: rationale || `Algorithmic ${normalizedSide.toUpperCase()} setup on ${sym} (${category})`,
        status: 'staged_pending_user_confirmation',
        actionableGuidance:
          warnings.length > 0
            ? `Trade Ticket ${ticketId} staged with risk warnings: ${warnings.join(' ')} Review before confirming.`
            : `Trade Ticket ${ticketId} staged successfully. Review the parameters and confirm to submit the order to Bitget v3.`,
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
