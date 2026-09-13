import { tool } from 'ai';
import { z } from 'zod';
import {
  getUnfilledOrdersV3,
  getPositionsV3,
  normalizeSymbol,
  toV3Category,
  createActionTicketToken,
} from '@/lib/bitget/trade';

export const getOpenOrdersParamsSchema = z.object({
  symbol: z.string().optional().describe('Optional symbol to filter open orders (e.g. BTCUSDT, RTSLAUSDT)'),
  category: z
    .enum(['all', 'spot', 'usdt-futures', 'coin-futures', 'usdc-futures'])
    .default('usdt-futures')
    .describe('Market category'),
});

export const cancelOrderParamsSchema = z.object({
  symbol: z.string().describe('Trading pair symbol of the order to cancel (e.g. BTCUSDT)'),
  category: z
    .enum(['spot', 'usdt-futures', 'coin-futures', 'usdc-futures'])
    .default('usdt-futures')
    .describe('Market category'),
  orderId: z.string().optional().describe('Exchange order ID to cancel'),
  clientOid: z.string().optional().describe('Client order ID to cancel'),
  cancelAll: z.boolean().default(false).optional().describe('Set to true to cancel ALL open orders for this symbol'),
});

export const closePositionParamsSchema = z.object({
  symbol: z.string().describe('Symbol of the open position to market close (e.g. BTCUSDT, RTSLAUSDT)'),
  category: z
    .enum(['spot', 'usdt-futures', 'coin-futures', 'usdc-futures'])
    .default('usdt-futures')
    .describe('Market category of the position'),
  posSide: z.enum(['long', 'short', 'net']).default('net').optional().describe('Position side to close'),
  sizePercent: z.coerce.number().min(1).max(100).default(100).optional().describe('Percentage of position to close (e.g. 50 for 50% de-risk, 100 for full close)'),
  rationale: z.string().optional().describe('Reason for closing or taking profit/cutting loss on this position'),
});

/**
 * Tool: Query working unfilled orders
 */
export const getOpenOrdersTool = tool({
  description:
    'Query working unfilled limit and trigger orders on Bitget across Spot and Perpetual Futures. Returns order IDs, prices, sizes, and order status.',
  inputSchema: getOpenOrdersParamsSchema,
  execute: async ({ symbol, category = 'usdt-futures' }) => {
    try {
      const v3Cat = category === 'all' ? 'USDT-FUTURES' : toV3Category(category);
      const orders = await getUnfilledOrdersV3(symbol, v3Cat);

      return {
        success: true,
        symbol: symbol ? normalizeSymbol(symbol) : undefined,
        category: v3Cat,
        orderCount: orders.length,
        orders: orders.map((o) => ({
          orderId: o.orderId,
          clientOid: o.clientOid,
          symbol: o.symbol,
          side: o.side,
          orderType: o.orderType,
          price: o.price,
          size: o.size,
          status: o.status,
          cumExecQty: o.cumExecQty || '0',
          cTime: o.cTime,
        })),
        summary:
          orders.length > 0
            ? `Found ${orders.length} open working order(s) for ${symbol || v3Cat}.`
            : `No open working orders found for ${symbol || v3Cat}.`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to query open orders';
      return { success: false, error: msg };
    }
  },
});

/**
 * Tool: Stage order cancellation with user confirmation
 */
export const cancelOrderTool = tool({
  description:
    'Stage a cancellation action ticket for an active open order on Bitget. Requires explicit user confirmation before executing.',
  inputSchema: cancelOrderParamsSchema,
  execute: async ({ symbol, category = 'usdt-futures', orderId, clientOid, cancelAll = false }) => {
    const sym = normalizeSymbol(symbol);
    const action = cancelAll ? 'cancel_symbol' : 'cancel_order';
    const actionId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    if (!cancelAll && !orderId && !clientOid) {
      return {
        success: false,
        error: 'Either orderId, clientOid, or cancelAll=true must be provided to cancel orders.',
      };
    }

    const actionToken = createActionTicketToken({
      actionId,
      action,
      symbol: sym,
      category,
      orderId,
      clientOid,
      timestamp: Date.now(),
    });

    return {
      success: true,
      actionId,
      actionToken,
      action,
      symbol: sym,
      category,
      orderId,
      clientOid,
      cancelAll,
      status: 'staged_pending_user_confirmation',
      summary: cancelAll
        ? `Stage cancellation of ALL active working orders for ${sym}.`
        : `Stage cancellation for order ${orderId || clientOid} on ${sym}.`,
      actionableGuidance: 'Review the cancellation request and confirm to cancel the order on Bitget.',
    };
  },
});

/**
 * Tool: Stage market close of an active position with user confirmation
 */
export const closePositionTool = tool({
  description:
    'Stage an emergency or targeted market close of an active position on Bitget via reduce-only order. Requires user confirmation.',
  inputSchema: closePositionParamsSchema,
  execute: async ({ symbol, category = 'usdt-futures', posSide = 'net', sizePercent = 100, rationale }) => {
    const sym = normalizeSymbol(symbol);
    const actionId = `close_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    try {
      // 1. Inspect live position to determine existing direction and available size
      const positions = await getPositionsV3(category);
      const targetPos = positions.find(
        (p) => normalizeSymbol(p.symbol) === sym && (posSide === 'net' || p.posSide === posSide)
      );

      const totalSize = targetPos ? parseFloat(targetPos.total || targetPos.available || '0') : 0;
      const currentSide = targetPos?.posSide || (targetPos?.holdSide as 'long' | 'short' | undefined) || 'long';
      // To close a long position: SELL. To close a short position: BUY.
      const closeSide: 'buy' | 'sell' = currentSide === 'short' ? 'buy' : 'sell';

      const closeQty = totalSize > 0
        ? parseFloat(((totalSize * sizePercent) / 100).toFixed(4)).toString()
        : undefined;

      const actionToken = createActionTicketToken({
        actionId,
        action: 'close_position',
        symbol: sym,
        category,
        side: closeSide,
        size: closeQty,
        posSide,
        timestamp: Date.now(),
      });

      return {
        success: true,
        actionId,
        actionToken,
        action: 'close_position',
        symbol: sym,
        category,
        closeSide,
        closeSize: closeQty,
        totalPositionSize: totalSize,
        sizePercent,
        posSide,
        unrealizedPnl: targetPos?.unrealisedPnl,
        markPrice: targetPos?.markPrice,
        rationale: rationale || `Market close ${sizePercent}% of ${sym} ${currentSide.toUpperCase()} position`,
        status: 'staged_pending_user_confirmation',
        actionableGuidance: `Stage market close for ${sizePercent}% of ${sym} position. Confirm to submit market exit.`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to stage position close';
      return { success: false, error: msg };
    }
  },
});
