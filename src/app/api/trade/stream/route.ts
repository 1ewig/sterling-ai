import { fetchPositionsV3 } from '@/lib/bitget/trade/positions';
import { fetchOpenOrdersV3 } from '@/lib/bitget/trade/queries';
import { createBitgetPrivateWsSession } from '@/lib/bitget/trade/private-ws';
import type { BitgetV3Position, BitgetV3OrderInfo } from '@/lib/bitget/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const apiKey = process.env.BITGET_API_KEY;
  const apiSecret = process.env.BITGET_API_SECRET;
  const passphrase = process.env.BITGET_PASSPHRASE;

  const isMissingConfig = !apiKey || !apiSecret || !passphrase;

  if (isMissingConfig) {
    const errorPayload = JSON.stringify({
      isMissingConfig: true,
      error: 'Bitget API credentials not configured in .env.local',
    });
    return new Response(`event: error\ndata: ${errorPayload}\n\n`, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isStreamClosed = false;

      const sendEvent = (event: string, data: unknown) => {
        if (isStreamClosed) return;
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          isStreamClosed = true;
        }
      };

      const sendComment = (comment: string) => {
        if (isStreamClosed) return;
        try {
          controller.enqueue(encoder.encode(`: ${comment}\n\n`));
        } catch {
          isStreamClosed = true;
        }
      };

      // 1. Initial 0ms Cold-Start REST Seed Snapshot
      try {
        const [positionsRes, ordersRes] = await Promise.allSettled([
          fetchPositionsV3('USDT-FUTURES'),
          fetchOpenOrdersV3({ categoryInput: 'all' }),
        ]);

        const positions: BitgetV3Position[] =
          positionsRes.status === 'fulfilled' && positionsRes.value.ok
            ? positionsRes.value.positions
            : [];

        const orders: BitgetV3OrderInfo[] =
          ordersRes.status === 'fulfilled' ? ordersRes.value.orders || [] : [];

        sendEvent('snapshot', {
          positions,
          orders,
          timestamp: Date.now(),
        });
      } catch (err) {
        sendEvent('snapshot_error', {
          error: err instanceof Error ? err.message : 'Failed to seed initial snapshot',
        });
      }

      // 2. Upstream Private WebSocket Session for Real-Time Streaming
      let wsSession: { close: () => void } | null = null;
      try {
        wsSession = createBitgetPrivateWsSession({
          onPositionsSnapshot(positions) {
            // Bitget WS pushes data: [] as a subscription acknowledgment.
            // Only send positions_snapshot if it actually contains active positions,
            // preventing overwriting the authoritative REST positions.
            if (positions && positions.length > 0) {
              sendEvent('positions_snapshot', { positions, timestamp: Date.now() });
            }
          },
          onPositionsUpdate(positions) {
            sendEvent('positions_update', { positions, timestamp: Date.now() });
          },
          onOrdersUpdate(orders) {
            sendEvent('orders_update', { orders, timestamp: Date.now() });
          },
          onAccountUpdate(account) {
            sendEvent('account_update', { account, timestamp: Date.now() });
          },
          onError(err) {
            sendEvent('ws_error', { error: err.message });
          },
          onClose() {
            sendComment('ws_closed');
          },
        });
      } catch (err) {
        sendEvent('error', {
          error: err instanceof Error ? err.message : 'Failed to establish upstream WebSocket',
        });
      }

      // 3. Keep-alive heartbeat interval (every 15 seconds)
      const heartbeatInterval = setInterval(() => {
        if (isStreamClosed) {
          clearInterval(heartbeatInterval);
          return;
        }
        sendComment('heartbeat');
      }, 15000);

      // Clean up resources when the client disconnects or aborts
      req.signal.addEventListener('abort', () => {
        isStreamClosed = true;
        clearInterval(heartbeatInterval);
        wsSession?.close();
        try {
          controller.close();
        } catch {
          // Stream already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
