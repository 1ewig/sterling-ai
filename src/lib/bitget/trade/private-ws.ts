import crypto from 'node:crypto';
import type { BitgetV3Position, BitgetV3OrderInfo, BitgetV3Category } from '../types';
import {
  BITGET_WS_PRIVATE_URL,
  BITGET_WS_PRIVATE_DEMO_URL,
} from '../constants';
import { mapOpenOrder, type RawUnfilledOrder } from './queries';

export interface BitgetPrivateWsCallbacks {
  onPositionsSnapshot?: (positions: BitgetV3Position[]) => void;
  onPositionsUpdate?: (positions: BitgetV3Position[]) => void;
  onOrdersUpdate?: (orders: BitgetV3OrderInfo[]) => void;
  onAccountUpdate?: (account: unknown, category?: BitgetV3Category) => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
}

export interface BitgetPrivateWsSession {
  close: () => void;
}

function mapWsRawPosition(p: Record<string, unknown>): BitgetV3Position {
  const avgPrice = String(p.avgPrice || p.openPriceAvg || '0');
  const unrealisedPnl = String(p.unrealisedPnl || p.unrealizedPL || '0');
  const posSide = (p.posSide || p.holdSide || 'net') as 'long' | 'short' | 'net';
  const mmr = String(p.mmr || p.marginRate || '0.005');
  const leverage = p.leverage !== undefined ? String(p.leverage) : '1';

  return {
    symbol: String(p.symbol || ''),
    posSide,
    total: String(p.total || '0'),
    available: String(p.available || '0'),
    frozen: String(p.frozen || p.locked || '0'),
    avgPrice,
    markPrice: String(p.markPrice || '0'),
    liquidationPrice: String(p.liquidationPrice || '0'),
    leverage,
    unrealisedPnl,
    profitRate: p.profitRate !== undefined ? String(p.profitRate) : undefined,
    mmr,
    breakEvenPrice: p.breakEvenPrice !== undefined ? String(p.breakEvenPrice) : undefined,
    marginMode: (p.marginMode as 'crossed' | 'isolated') || 'crossed',
    holdMode: (p.holdMode as 'single_hold' | 'double_hold') || 'single_hold',
    positionStatus: (p.positionStatus as 'normal' | 'liquidation') || 'normal',
    cTime: String(p.cTime || p.uTime || ''),
    uTime: p.uTime !== undefined ? String(p.uTime) : undefined,
    openPriceAvg: avgPrice,
    unrealizedPL: unrealisedPnl,
    holdSide: posSide,
    marginCoin: String(p.marginCoin || 'USDT'),
    margin: String(p.margin || '0'),
    marginRate: mmr,
    locked: String(p.frozen || p.locked || '0'),
  };
}

/**
 * Creates an authenticated Bitget Private WebSocket session (UTA v2/v3).
 * Subscribes to positions, orders, and account streams.
 */
export function createBitgetPrivateWsSession(
  callbacks: BitgetPrivateWsCallbacks
): BitgetPrivateWsSession {
  const apiKey = process.env.BITGET_API_KEY;
  const apiSecret = process.env.BITGET_API_SECRET;
  const passphrase = process.env.BITGET_PASSPHRASE;
  const isDemo = process.env.BITGET_DEMO_TRADING === 'true';

  if (!apiKey || !apiSecret || !passphrase) {
    throw new Error('Bitget API credentials not configured');
  }

  const wsUrl = isDemo ? BITGET_WS_PRIVATE_DEMO_URL : BITGET_WS_PRIVATE_URL;

  let isClosed = false;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  const ws = new globalThis.WebSocket(wsUrl);

  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    try {
      if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
        ws.close();
      }
    } catch {
      // Ignore socket closing errors
    }
    callbacks.onClose?.();
  };

  ws.onopen = () => {
    if (isClosed) return;

    // Start 20s heartbeat ping
    pingTimer = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send('ping');
        } catch {
          // Socket might have dropped
        }
      }
    }, 20000);

    // Sign login: timestamp + 'GET' + '/user/verify'
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signPath = '/user/verify';
    const preHash = `${timestamp}GET${signPath}`;
    const sign = crypto.createHmac('sha256', apiSecret).update(preHash).digest('base64');

    const loginMsg = {
      op: 'login',
      args: [
        {
          apiKey,
          passphrase,
          timestamp,
          sign,
        },
      ],
    };

    ws.send(JSON.stringify(loginMsg));
  };

  ws.onmessage = (event) => {
    if (isClosed) return;
    const raw = event.data?.toString() || '';
    if (raw === 'pong') return;

    try {
      const parsed = JSON.parse(raw) as {
        event?: string;
        code?: number;
        msg?: string;
        action?: 'snapshot' | 'update';
        arg?: {
          instType?: string;
          channel?: string;
          instId?: string;
          coin?: string;
        };
        data?: Array<Record<string, unknown>>;
      };

      if (parsed.event === 'login') {
        if (parsed.code === 0 || parsed.msg === 'success') {
          // Authenticated successfully. Subscribe to UTA channels
          const subMsg = {
            op: 'subscribe',
            args: [
              { instType: 'USDT-FUTURES', channel: 'positions', instId: 'default' },
              { instType: 'USDT-FUTURES', channel: 'orders', instId: 'default' },
              { instType: 'USDT-FUTURES', channel: 'orders-algo', instId: 'default' },
              { instType: 'USDT-FUTURES', channel: 'account', coin: 'default' },
              { instType: 'SPOT', channel: 'account', coin: 'default' },
              { instType: 'SPOT', channel: 'orders', instId: 'default' },
            ],
          };
          ws.send(JSON.stringify(subMsg));
        } else {
          callbacks.onError?.(new Error(`WebSocket login failed: ${parsed.msg || 'Unknown error'}`));
        }
        return;
      }

      if (parsed.arg && parsed.data) {
        const channel = parsed.arg.channel;
        const instType = (parsed.arg.instType || 'USDT-FUTURES') as BitgetV3Category;

        if (channel === 'positions') {
          const mappedPositions = parsed.data.map(mapWsRawPosition);
          if (parsed.action === 'snapshot') {
            callbacks.onPositionsSnapshot?.(mappedPositions);
          } else {
            callbacks.onPositionsUpdate?.(mappedPositions);
          }
        } else if (channel === 'orders' || channel === 'orders-algo') {
          const mappedOrders = parsed.data.map((o) =>
            mapOpenOrder(o as RawUnfilledOrder, instType)
          );
          callbacks.onOrdersUpdate?.(mappedOrders);
        } else if (channel === 'account') {
          callbacks.onAccountUpdate?.(parsed.data, instType);
        }
      }
    } catch (e) {
      callbacks.onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  };

  ws.onerror = (err) => {
    if (!isClosed) {
      callbacks.onError?.(new Error(`WebSocket error event: ${String(err)}`));
    }
  };

  ws.onclose = () => {
    cleanup();
  };

  return {
    close: cleanup,
  };
}

/* -------------------------------------------------------------------------- */
/*             Server-Side Shared WebSocket Singleton Broadcast Hub            */
/* -------------------------------------------------------------------------- */

export interface WsHubListener {
  id: string;
  onEvent: (event: string, data: unknown) => void;
  onComment?: (comment: string) => void;
}

class BitgetPrivateWsHub {
  private session: BitgetPrivateWsSession | null = null;
  private listeners = new Map<string, WsHubListener>();
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  private broadcast(event: string, data: unknown) {
    for (const listener of this.listeners.values()) {
      try {
        listener.onEvent(event, data);
      } catch {
        // Ignore listener write error
      }
    }
  }

  private broadcastComment(comment: string) {
    for (const listener of this.listeners.values()) {
      try {
        listener.onComment?.(comment);
      } catch {
        // Ignore listener write error
      }
    }
  }

  private ensureConnected() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    if (!this.session) {
      try {
        this.session = createBitgetPrivateWsSession({
          onPositionsSnapshot: (positions) => {
            // Guard: empty data: [] ACK frame must not wipe out active positions
            if (positions.length > 0) {
              this.broadcast('positions_snapshot', { positions, timestamp: Date.now() });
            }
          },
          onPositionsUpdate: (positions) => {
            this.broadcast('positions_update', { positions, timestamp: Date.now() });
          },
          onOrdersUpdate: (orders) => {
            this.broadcast('orders_update', { orders, timestamp: Date.now() });
          },
          onAccountUpdate: (account, category) => {
            this.broadcast('account_update', { account, category, timestamp: Date.now() });
          },
          onError: (err) => {
            this.broadcast('ws_error', { error: err.message });
          },
          onClose: () => {
            this.session = null;
            this.broadcastComment('ws_closed');
          },
        });
      } catch (err) {
        this.broadcast('error', {
          error: err instanceof Error ? err.message : 'Failed to establish upstream WebSocket',
        });
      }
    }
  }

  subscribe(listener: WsHubListener): () => void {
    this.listeners.set(listener.id, listener);
    this.ensureConnected();

    return () => {
      this.listeners.delete(listener.id);
      if (this.listeners.size === 0) {
        // 30s grace period before closing upstream WebSocket connection
        // Allows tab refresh, HMR, and multi-window navigation without reconnecting
        if (this.idleTimer) clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => {
          if (this.listeners.size === 0 && this.session) {
            this.session.close();
            this.session = null;
          }
        }, 30000);
      }
    };
  }

  getListenerCount(): number {
    return this.listeners.size;
  }
}

// Global singleton instance across Next.js API route invocations
const globalForHub = globalThis as unknown as {
  bitgetPrivateWsHub?: BitgetPrivateWsHub;
};

export const privateWsHub =
  globalForHub.bitgetPrivateWsHub ?? new BitgetPrivateWsHub();

if (process.env.NODE_ENV !== 'production') {
  globalForHub.bitgetPrivateWsHub = privateWsHub;
}
