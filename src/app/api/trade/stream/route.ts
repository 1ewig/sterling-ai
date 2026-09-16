import { fetchPositionsV3 } from '@/lib/bitget/trade/positions';
import { fetchOpenOrdersV3 } from '@/lib/bitget/trade/queries';
import { createSseStream } from '@/lib/bitget/trade/sse';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const apiKey = process.env.BITGET_API_KEY;
  const apiSecret = process.env.BITGET_API_SECRET;
  const passphrase = process.env.BITGET_PASSPHRASE;

  const isMissingConfig = !apiKey || !apiSecret || !passphrase;

  if (isMissingConfig) {
    const { getSandboxOrdersAndPositions } = await import('@/lib/sandbox/sandbox-broker');
    return createSseStream('tab_trade_sb', async () => getSandboxOrdersAndPositions(), req.signal);
  }

  const fetchSnapshot = async () => {
    const [positionsRes, ordersRes] = await Promise.allSettled([
      fetchPositionsV3('USDT-FUTURES'),
      fetchOpenOrdersV3({ categoryInput: 'all' }),
    ]);

    return {
      positions:
        positionsRes.status === 'fulfilled' && positionsRes.value.ok
          ? positionsRes.value.positions
          : [],
      orders: ordersRes.status === 'fulfilled' ? ordersRes.value.orders || [] : [],
    };
  };

  return createSseStream('tab', fetchSnapshot, req.signal);
}