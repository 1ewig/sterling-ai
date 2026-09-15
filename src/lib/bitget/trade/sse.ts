import { privateWsHub } from './private-ws';

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
} as const;

const SYNC_INTERVAL_MS = 2500;
const HEARTBEAT_INTERVAL_MS = 15000;

/**
 * Builds an SSE error response used when Bitget credentials are missing.
 */
export function missingConfigSseResponse(message = 'Bitget API credentials not configured in .env.local'): Response {
  const errorPayload = JSON.stringify({ isMissingConfig: true, error: message });
  return new Response(`event: error\ndata: ${errorPayload}\n\n`, { headers: SSE_HEADERS });
}

/**
 * Creates a persistent SSE stream that:
 *  1. Seeds an initial snapshot via `fetchSnapshot`
 *  2. Re-syncs a full snapshot on a fixed interval
 *  3. Pushes private WS hub events/comments to the client
 *  4. Emits heartbeat comments and tears down on client abort
 */
export function createSseStream(
  clientIdPrefix: string,
  fetchSnapshot: () => Promise<Record<string, unknown>>,
  abortSignal: AbortSignal
): Response {
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
        const baseline = await fetchSnapshot();
        sendEvent('snapshot', { ...baseline, timestamp: Date.now() });
      } catch (err) {
        sendEvent('snapshot_error', {
          error: err instanceof Error ? err.message : 'Failed to seed initial snapshot',
        });
      }

      // 2. Subscribe to Shared Upstream Private WebSocket Hub (1 connection for all tabs)
      const clientId = `${clientIdPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const unsubscribeFromHub = privateWsHub.subscribe({
        id: clientId,
        onEvent: (event, data) => {
          sendEvent(event, data);
        },
        onComment: (comment) => {
          sendComment(comment);
        },
      });

      // 3. Continuous Server-Side Stream Synchronization (every 2.5 seconds)
      let isSyncing = false;
      let syncInterval: ReturnType<typeof setInterval> | undefined;
      syncInterval = setInterval(async () => {
        if (isStreamClosed) {
          clearInterval(syncInterval);
          return;
        }
        if (isSyncing) return;
        isSyncing = true;
        try {
          const baseline = await fetchSnapshot();
          sendEvent('snapshot', { ...baseline, timestamp: Date.now() });
        } catch {
          // Ignore transient network hiccups
        } finally {
          isSyncing = false;
        }
      }, SYNC_INTERVAL_MS);

      // 4. Keep-alive heartbeat interval (every 15 seconds)
      const heartbeatInterval = setInterval(() => {
        if (isStreamClosed) {
          clearInterval(heartbeatInterval);
          return;
        }
        sendComment('heartbeat');
      }, HEARTBEAT_INTERVAL_MS);

      // Clean up resources when the client disconnects or aborts
      abortSignal.addEventListener(
        'abort',
        () => {
          isStreamClosed = true;
          clearInterval(syncInterval);
          clearInterval(heartbeatInterval);
          unsubscribeFromHub();
          try {
            controller.close();
          } catch {
            // Stream already closed
          }
        },
        { once: true }
      );
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}