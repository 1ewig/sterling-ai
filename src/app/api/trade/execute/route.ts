import { NextResponse } from 'next/server';
import { placeOrderV3 } from '@/lib/bitget/trade';
import type { BitgetV3OrderParams } from '@/lib/bitget/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      symbol: string;
      category?: 'spot' | 'usdt-futures' | 'coin-futures' | 'usdc-futures';
      side: 'buy' | 'sell';
      orderType?: 'limit' | 'market';
      size: number;
      price?: number;
      tradeSide?: 'open' | 'close';
      leverage?: number;
      stopLossPrice?: number;
      takeProfitPrice?: number;
      clientOid?: string;
    };

    if (!body.symbol || !body.side || !body.size) {
      return NextResponse.json(
        { error: 'Missing required parameters: symbol, side, size' },
        { status: 400 }
      );
    }

    const orderParams: BitgetV3OrderParams = {
      symbol: body.symbol,
      category: body.category || 'usdt-futures',
      side: body.side,
      orderType: body.orderType || 'limit',
      size: body.size.toString(),
      price: body.price ? body.price.toString() : undefined,
      tradeSide: body.tradeSide || 'open',
      presetStopLossPrice: body.stopLossPrice ? body.stopLossPrice.toString() : undefined,
      presetTakeProfitPrice: body.takeProfitPrice ? body.takeProfitPrice.toString() : undefined,
      clientOid: body.clientOid,
    };

    const result = await placeOrderV3(orderParams);

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      clientOid: result.clientOid,
      symbol: result.symbol,
      status: 'submitted',
      message: `Order submitted to Bitget v3 UTA (${body.side.toUpperCase()} ${body.size} ${body.symbol})`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown execution error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
