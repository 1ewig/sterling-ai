import crypto from 'node:crypto';
import type { BitgetV3Position, BitgetV3OrderInfo, BitgetV3Category } from '../types';
import { mapOpenOrder, type RawUnfilledOrder } from './queries';

export interface BitgetPrivateWsCallbacks {
  onPositionsSnapshot?: (positions: BitgetV3Position[]) => void;
  onPositionsUpdate?: (positions: BitgetV3Position[]) => void;
  onOrdersUpdate?: (orders: BitgetV3OrderInfo[]) => void;
  onAccountUpdate?: (account: unknown) => void;
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

  const wsUrl = isDemo
    ? 'wss://wspap.bitget.com/v2/ws/private'
    : 'wss://ws.bitget.com/v2/ws/private';

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
          callbacks.onAccountUpdate?.(parsed.data);
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
