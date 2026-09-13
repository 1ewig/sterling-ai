import { tool } from 'ai';
import { z } from 'zod';
import {
  fetchOpenOrdersV3,
  getPositionsV3,
  normalizeSymbol,
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
    'Query working unfilled orders on Bitget. Supports all categories (default USDT-FUTURES; use category="all" to aggregate USDT-FUTURES + SPOT + COIN-FUTURES + USDC-FUTURES). Returns order IDs, prices, sizes, hedge-mode position side (posSide/holdMode), conditional/plan order detection via delegateType, reduce-only flag, margin mode, and order age. The result carries a success flag and per-category sources/warnings — always check success before concluding there are no open orders.',
  inputSchema: getOpenOrdersParamsSchema,
  execute: async ({ symbol, category = 'usdt-futures' }) => {
    try {
      const result = await fetchOpenOrdersV3({ symbol, categoryInput: category });
      const orders = result.orders;

      return {
        success: result.success,
        symbol: symbol ? normalizeSymbol(symbol) : undefined,
        category,
        categories: result.categories,
        orderCount: orders.length,
        orders: orders.map((o) => ({
          orderId: o.orderId,
          clientOid: o.clientOid,
          symbol: o.symbol,
          category: o.category,
          side: o.side,
          orderType: o.orderType,
          price: o.price,
          size: o.size,
          status: o.status,
          statusLabel: statusLabel(o.status),
          posSide: o.posSide || undefined,
          holdMode: o.holdMode || undefined,
          reduceOnly: o.reduceOnly || undefined,
          timeInForce: o.timeInForce || undefined,
          marginMode: o.marginMode || undefined,
          delegateType: o.delegateType,
          orderKind: describeDelegate(o.delegateType),
          isConditional: isConditionalOrder(o.delegateType),
          stopLoss: o.stopLoss || undefined,
          takeProfit: o.takeProfit || undefined,
          cumExecQty: o.cumExecQty || '0',
          cumExecValue: o.cumExecValue || undefined,
          avgPrice: o.avgPrice,
          cTime: o.cTime,
          ageSeconds: o.cTime ? ageSeconds(o.cTime) : undefined,
        })),
        warnings: result.warnings.length > 0 ? result.warnings : undefined,
        perCategory: result.perCategory,
        sources: result.sources,
        totalPages: result.totalPages,
        error: result.error
          ? {
              code: result.error.code,
              message: result.error.message,
              actionableGuidance: result.error.actionableGuidance,
            }
          : undefined,
        summary: buildSummary(orders, symbol, category),
        actionableGuidance:
          !result.success && result.error ? result.error.actionableGuidance : undefined,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to query open orders';
      return { success: false, error: msg };
    }
  },
});

function statusLabel(status: string): string {
  switch (status) {
    case 'init':
      return 'pending match';
    case 'new':
      return 'open (matching)';
    case 'live':
      return 'open (working)';
    case 'partially_filled':
      return 'partially filled';
    case 'filled':
      return 'filled';
    case 'cancelled':
      return 'cancelled';
    default:
      return status;
  }
}

function ageSeconds(createdTime: string): number {
  const ts = Number(createdTime);
  if (!Number.isFinite(ts) || ts <= 0) return 0;
  return Math.max(0, Math.floor((Date.now() - ts) / 1000));
}

function describeDelegate(delegateType?: string): string {
  if (!delegateType) return 'normal (maker/taker)';
  const labels: Record<string, string> = {
    normal: 'normal (maker/taker)',
    stop_profit_market: 'market take-profit trigger',
    stop_loss_market: 'market stop-loss trigger',
    stop_profit_limit: 'limit take-profit trigger',
    stop_loss_limit: 'limit stop-loss trigger',
    plan_limit: 'conditional/plan limit',
    plan_market: 'conditional/plan market',
    move_stop_limit: 'trailing stop (limit)',
    move_stop_market: 'trailing stop (market)',
    tracking_plan_limit: 'tracking plan (limit)',
    tracking_plan_market: 'tracking plan (market)',
  };
  return labels[delegateType] ?? delegateType.replace(/_/g, ' ');
}

function isConditionalOrder(delegateType?: string): boolean {
  if (!delegateType) return false;
  const patterns = ['plan_', 'stop_', 'tracking_', 'move_stop', 'position_stop', 'tp_', 'sl_'];
  return patterns.some((p) => delegateType.includes(p));
}

function buildSummary(orders: Array<{ size: string; cTime?: string }>, symbol?: string, category = 'usdt-futures'): string {
  if (orders.length === 0) {
    return `No open working orders found for ${symbol ? normalizeSymbol(symbol) : category.toUpperCase()}.`;
  }
  const totalSize = orders.reduce((sum, o) => sum + (parseFloat(o.size) || 0), 0);
  const recent = Math.max(...orders.filter((o) => o.cTime).map((o) => ageSeconds(o.cTime || '')));
  return `Found ${orders.length} open working order(s) for ${symbol ? normalizeSymbol(symbol) : category.toUpperCase()} (total size ${totalSize.toFixed(4)}, oldest ${recent}s old).`;
}

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
