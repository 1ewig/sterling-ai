import { NextResponse } from 'next/server';
import {
  cancelOrderV3,
  cancelSymbolOrdersV3,
  closePositionsV3,
} from '@/lib/bitget/trade';
import { verifyActionTicketToken } from '@/lib/bitget/auth';
import { resolveTradingMode } from '@/lib/sandbox/trading-mode';
import { toV3Category } from '@/lib/bitget/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      actionToken?: string;
      action?: 'cancel_order' | 'cancel_symbol' | 'close_position';
      symbol?: string;
      category?: string;
      orderId?: string;
      clientOid?: string;
      side?: 'buy' | 'sell';
      size?: string;
      posSide?: 'long' | 'short' | 'net';
      marginMode?: 'crossed' | 'isolated';
    };

    let action = body.action;
    let symbol = body.symbol;
    let category = body.category || 'usdt-futures';
    let orderId = body.orderId;
    let clientOid = body.clientOid;
    let side = body.side;
    let size = body.size;
    let posSide = body.posSide;
    let marginMode = body.marginMode;

    if (body.actionToken) {
      const verification = verifyActionTicketToken(body.actionToken);
      if (!verification.valid || !verification.payload) {
        return NextResponse.json(
          { success: false, error: verification.error || 'Invalid or expired action ticket.' },
          { status: 400 }
        );
      }
      const p = verification.payload;
      action = p.action;
      symbol = p.symbol;
      category = p.category;
      orderId = p.orderId;
      clientOid = p.clientOid;
      side = p.side;
      size = p.size;
      posSide = p.posSide;
      marginMode = p.marginMode;
    }

    if (!action || !symbol) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: action and symbol are required.' },
        { status: 400 }
      );
    }

    // Check trading mode (Sandbox vs Live)
    const isSandbox = resolveTradingMode(req) === 'sandbox';

    if (isSandbox) {
      const { closeSandboxPosition, cancelSandboxOrder } = await import(
        '@/lib/sandbox/sandbox-broker'
      );

      if (action === 'close_position') {
        const sbClose = closeSandboxPosition(
          symbol,
          (side as 'buy' | 'sell') || 'sell',
          size
        );
        return NextResponse.json({
          success: true,
          action: 'close_position',
          symbol,
          orderId: sbClose.orderId,
          message: sbClose.message,
          isSandbox: true,
        });
      }

      if (action === 'cancel_order' || action === 'cancel_symbol') {
        const sbCancel = cancelSandboxOrder(orderId, symbol);
        return NextResponse.json({
          success: true,
          action,
          symbol,
          orderId,
          message: sbCancel.message,
          isSandbox: true,
        });
      }
    }

    if (action === 'cancel_order') {
      if (!orderId && !clientOid) {
        return NextResponse.json(
          { success: false, error: 'Cancelling an order requires either orderId or clientOid.' },
          { status: 400 }
        );
      }
      const res = await cancelOrderV3({
        symbol,
        category: toV3Category(category),
        orderId,
        clientOid,
      });
      return NextResponse.json({
        success: true,
        action: 'cancel_order',
        symbol,
        orderId: res.orderId,
        alreadyTerminal: (res as { alreadyTerminal?: boolean }).alreadyTerminal,
        message:
          (res as { message?: string }).message ||
          `Order ${orderId || clientOid} cancelled successfully.`,
      });
    }

    if (action === 'cancel_symbol') {
      await cancelSymbolOrdersV3(symbol, category);
      return NextResponse.json({
        success: true,
        action: 'cancel_symbol',
        symbol,
        message: `All open orders for ${symbol} have been cancelled.`,
      });
    }

    if (action === 'close_position') {
      if (!side) {
        return NextResponse.json(
          { success: false, error: 'Closing a position requires the execution side (buy to close short, sell to close long).' },
          { status: 400 }
        );
      }
      const res = await closePositionsV3(symbol, category, side, size, posSide, marginMode);
      return NextResponse.json({
        success: true,
        action: 'close_position',
        symbol,
        orderId: res.orderId,
        message: `Position close order submitted for ${symbol} (${side.toUpperCase()}).`,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Action execution failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
