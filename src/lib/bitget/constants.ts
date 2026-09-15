/**
 * Canonical Bitget exchange domain constants, endpoints, and defaults.
 * Pure leaf module with zero external dependencies.
 */

export type BitgetV3Category = 'SPOT' | 'USDT-FUTURES' | 'COIN-FUTURES' | 'USDC-FUTURES';

/** Base URLs for Bitget API endpoints */
export const BITGET_REST_BASE = 'https://api.bitget.com';
export const BITGET_TIME_URL = 'https://api.bitget.com/api/v2/public/time';

/** WebSocket Stream Endpoints */
export const BITGET_WS_PUBLIC_URL = 'wss://ws.bitget.com/v3/ws/public';
export const BITGET_WS_PRIVATE_URL = 'wss://ws.bitget.com/v2/ws/private';
export const BITGET_WS_PRIVATE_DEMO_URL = 'wss://wspap.bitget.com/v2/ws/private';

/** Network & Clock Sync Timeouts */
export const FETCH_TIMEOUT_MS = 6000;
export const SERVER_TIME_SYNC_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const TICKET_TTL_MS = 5 * 60 * 1000; // 5 minutes validity for HMAC tickets

/** Core Market Categories */
export const USDT_FUTURES_CATEGORY = 'USDT-FUTURES' as const;
export const SPOT_CATEGORY = 'SPOT' as const;
export const COIN_FUTURES_CATEGORY = 'COIN-FUTURES' as const;
export const USDC_FUTURES_CATEGORY = 'USDC-FUTURES' as const;

/** Global Trading Defaults */
export const DEFAULT_SYMBOL = 'BTCUSDT';
export const DEFAULT_LEVERAGE = 5;
