import { getAccountOverviewV3 } from '@/lib/bitget/trade/account';
import { privateWsHub } from '@/lib/bitget/trade/private-ws';
import type { BitgetAccountOverview } from '@/lib/bitget/types';

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
        const overview: BitgetAccountOverview = await getAccountOverviewV3('all');
        sendEvent('snapshot', {
          overview,
          timestamp: Date.now(),
        });
      } catch (err) {
        sendEvent('snapshot_error', {
          error: err instanceof Error ? err.message : 'Failed to seed initial account snapshot',
        });
      }

      // 2. Subscribe to Shared Upstream Private WebSocket Hub (1 connection for all tabs)
      const clientId = `tab_acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const unsubscribeFromHub = privateWsHub.subscribe({
        id: clientId,
        onEvent: (event, data) => {
          sendEvent(event, data);
        },
        onComment: (comment) => {
          sendComment(comment);
        },
      });

      // 3. Keep-alive heartbeat interval (every 15 seconds)
      const heartbeatInterval = setInterval(() => {
        if (isStreamClosed) {
          clearInterval(heartbeatInterval);
          return;
        }
        sendComment('heartbeat');
      }, 15000);

      // Clean up resources when client disconnects or aborts
      req.signal.addEventListener('abort', () => {
        isStreamClosed = true;
        clearInterval(heartbeatInterval);
        unsubscribeFromHub();
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
