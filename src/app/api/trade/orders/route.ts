import { NextResponse } from 'next/server';
import { fetchPositionsV3 } from '@/lib/bitget/trade/positions';
import { fetchOpenOrdersV3 } from '@/lib/bitget/trade/queries';
import { getSandboxOrdersAndPositions } from '@/lib/sandbox/sandbox-broker';
import {
  resolveTradingMode,
  isMissingConfigError,
  sandboxResponse,
} from '@/lib/sandbox/trading-mode';
import type { BitgetV3Position, BitgetV3OrderInfo } from '@/lib/bitget/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  if (resolveTradingMode(req) === 'sandbox') {
    return NextResponse.json(sandboxResponse(getSandboxOrdersAndPositions()));
  }

  try {
    const [positionsRes, ordersRes] = await Promise.allSettled([
      fetchPositionsV3('USDT-FUTURES'),
      fetchOpenOrdersV3({ categoryInput: 'all' }),
    ]);

    let positions: BitgetV3Position[] = [];
    let orders: BitgetV3OrderInfo[] = [];
    const errors: string[] = [];

    if (positionsRes.status === 'fulfilled') {
      if (positionsRes.value.ok) {
        positions = positionsRes.value.positions;
      } else if (positionsRes.value.error?.message) {
        errors.push(positionsRes.value.error.message);
      }
    } else {
      errors.push(positionsRes.reason instanceof Error ? positionsRes.reason.message : 'Positions query failed');
    }

    if (ordersRes.status === 'fulfilled') {
      orders = ordersRes.value.orders || [];
      if (!ordersRes.value.success && ordersRes.value.error?.message) {
        errors.push(ordersRes.value.error.message);
      }
    } else {
      errors.push(ordersRes.reason instanceof Error ? ordersRes.reason.message : 'Open orders query failed');
    }

    if (isMissingConfigError(errors[0])) {
      return NextResponse.json(
        sandboxResponse(getSandboxOrdersAndPositions(), { isMissingConfig: false, isPaperFallback: true })
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        positions,
        orders,
        timestamp: Date.now(),
      },
      errors: errors.length > 0 ? errors : undefined,
      isMissingConfig: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch orders and positions';

    if (isMissingConfigError(message)) {
      return NextResponse.json(
        sandboxResponse(getSandboxOrdersAndPositions(), { isMissingConfig: false, isPaperFallback: true })
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
        isMissingConfig: false,
        data: {
          positions: [],
          orders: [],
          timestamp: Date.now(),
        },
      },
      { status: 200 }
    );
  }
}
