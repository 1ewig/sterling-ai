export type BitgetErrorCategory =
  | 'MISSING_CREDENTIALS'
  | 'AUTH_FAILED'
  | 'IP_BLOCKED'
  | 'INSUFFICIENT_FUNDS'
  | 'ORDER_INVALID'
  | 'RATE_LIMITED'
  | 'ORDER_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'LEVERAGE_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'EXCHANGE_ERROR';

export interface BitgetErrorDetails {
  category: BitgetErrorCategory;
  code?: string;
  message: string;
  actionableGuidance: string;
  canRetry: boolean;
}
