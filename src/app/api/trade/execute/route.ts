import { NextResponse } from 'next/server';
import { placeOrderV3, getOrderInfoV3 } from '@/lib/bitget/trade';
import { verifyTradeTicketToken } from '@/lib/bitget/auth';
import type { BitgetV3OrderParams } from '@/lib/bitget/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      ticketToken?: string;
      symbol?: string;
      category?: string;
      side?: 'buy' | 'sell';
      orderType?: 'limit' | 'market';
      size?: number;
      price?: number;
      tradeSide?: 'open' | 'close';
      leverage?: number;
      stopLossPrice?: number;
      takeProfitPrice?: number;
      clientOid?: string;
    };

    let orderParams: BitgetV3OrderParams;

    // 1. If a cryptographically signed ticket token is provided, verify it
    if (body.ticketToken) {
      const verification = verifyTradeTicketToken(body.ticketToken);
      if (!verification.valid || !verification.payload) {
        return NextResponse.json(
          { success: false, error: verification.error || 'Invalid or expired trade ticket.' },
          { status: 400 }
        );
      }

      const p = verification.payload;
      orderParams = {
        symbol: p.symbol,
        category: p.category as BitgetV3OrderParams['category'],
        side: p.side,
        orderType: p.orderType,
        size: p.size.toString(),
        price: p.price ? p.price.toString() : undefined,
        tradeSide: p.tradeSide || 'open',
        stopLossPrice: p.stopLossPrice ? p.stopLossPrice.toString() : undefined,
        takeProfitPrice: p.takeProfitPrice ? p.takeProfitPrice.toString() : undefined,
        clientOid: p.clientOid,
      };
    } else {
      // Legacy fallback parameter parsing
      if (!body.symbol || !body.side || !body.size) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameters: symbol, side, size' },
          { status: 400 }
        );
      }

      orderParams = {
        symbol: body.symbol,
        category: (body.category as BitgetV3OrderParams['category']) || 'usdt-futures',
        side: body.side,
        orderType: body.orderType || 'limit',
        size: body.size.toString(),
        price: body.price ? body.price.toString() : undefined,
        tradeSide: body.tradeSide || 'open',
        stopLossPrice: body.stopLossPrice ? body.stopLossPrice.toString() : undefined,
        takeProfitPrice: body.takeProfitPrice ? body.takeProfitPrice.toString() : undefined,
        clientOid: body.clientOid,
      };
    }

    // 2. Check trading mode (Sandbox vs Live)
    const reqMode = req.headers.get('x-trading-mode');
    const isSandbox =
      reqMode === 'sandbox' ||
      (!process.env.BITGET_API_KEY && !req.headers.get('x-bitget-api-key'));

    if (isSandbox) {
      const { executeSandboxOrder } = await import('@/lib/sandbox/sandbox-broker');
      const sbResult = executeSandboxOrder(orderParams);
      return NextResponse.json({
        success: true,
        orderId: sbResult.orderId,
        clientOid: sbResult.clientOid,
        symbol: sbResult.symbol,
        category: sbResult.category,
        status: sbResult.status,
        avgPrice: sbResult.avgPrice,
        message: sbResult.message,
        isSandbox: true,
      });
    }

    // 3. Submit order to Bitget v3 UTA
    const result = await placeOrderV3(orderParams);

    // 3. Short polling (up to 1.5s) to capture instant market fills or limit acceptances
    let terminalInfo: {
      status?: string;
      avgPrice?: string;
      cumExecQty?: string;
      feeDetail?: Array<{ feeCoin: string; fee: string }>;
    } | null = null;

    if (result.orderId || result.clientOid) {
      try {
        await new Promise((r) => setTimeout(r, 600));
        terminalInfo = await getOrderInfoV3(
          result.symbol,
          result.category,
          result.orderId,
          result.clientOid
        );
      } catch {
        // Fall back to submitted status
      }
    }

    const finalStatus = terminalInfo?.status || result.status || 'submitted';
    const fillPrice = terminalInfo?.avgPrice && parseFloat(terminalInfo.avgPrice) > 0
      ? terminalInfo.avgPrice
      : orderParams.price;

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      clientOid: result.clientOid,
      symbol: result.symbol,
      category: result.category,
      status: finalStatus,
      avgPrice: fillPrice,
      cumExecQty: terminalInfo?.cumExecQty,
      feeDetail: terminalInfo?.feeDetail,
      message:
        finalStatus === 'filled'
          ? `Order filled at average price $${fillPrice}`
          : `Order ${finalStatus} on Bitget v3 UTA (${orderParams.side.toUpperCase()} ${orderParams.size} ${orderParams.symbol})`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Execution error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
