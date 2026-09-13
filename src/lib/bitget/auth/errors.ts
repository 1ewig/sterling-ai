import type { BitgetErrorDetails } from '../types';

/**
 * Classifies Bitget raw error codes and error messages into structured recovery guidance.
 */
export function classifyBitgetError(code: string, rawMsg = ''): BitgetErrorDetails {
  const cleanCode = code.toString().trim();
  const lowerMsg = rawMsg.toLowerCase();

  // Authentication & API Key Errors
  if (
    cleanCode === '40006' ||
    cleanCode === '40014' ||
    cleanCode === '40015' ||
    cleanCode === '40012' ||
    lowerMsg.includes('invalid access_key') ||
    lowerMsg.includes('signature') ||
    lowerMsg.includes('passphrase') ||
    lowerMsg.includes('api key')
  ) {
    return {
      category: 'AUTH_FAILED',
      code: cleanCode,
      message: rawMsg || 'Bitget API authentication failed.',
      actionableGuidance:
        'Verify BITGET_API_KEY, BITGET_API_SECRET, and BITGET_PASSPHRASE in .env.local. Ensure permissions include Read/Trade.',
      canRetry: false,
    };
  }

  // Timestamp drift / clock sync
  if (cleanCode === '40017' || lowerMsg.includes('timestamp')) {
    return {
      category: 'AUTH_FAILED',
      code: cleanCode,
      message: rawMsg || 'Request timestamp expired or out of sync.',
      actionableGuidance:
        'System clock is out of sync with Bitget server time. Synchronize your system clock with NTP.',
      canRetry: true,
    };
  }

  // IP Whitelist restrictions
  if (cleanCode === '40034' || cleanCode === '40035' || lowerMsg.includes('ip') || lowerMsg.includes('whitelist')) {
    return {
      category: 'IP_BLOCKED',
      code: cleanCode,
      message: rawMsg || 'IP address is not whitelisted on Bitget API key.',
      actionableGuidance:
        'Add your current server/public IP to the Bitget API Key IP Whitelist in your Bitget API management console.',
      canRetry: false,
    };
  }

  // Insufficient Balance / Margin
  if (
    cleanCode === '25203' ||
    cleanCode === '25202' ||
    cleanCode === '43012' ||
    cleanCode === '43013' ||
    cleanCode === '40754' ||
    lowerMsg.includes('balance') ||
    lowerMsg.includes('insufficient') ||
    lowerMsg.includes('margin')
  ) {
    return {
      category: 'INSUFFICIENT_FUNDS',
      code: cleanCode,
      message: rawMsg || 'Insufficient account balance or available margin.',
      actionableGuidance:
        'Deposit or transfer additional USDT collateral into your Bitget trading account or reduce order size.',
      canRetry: false,
    };
  }

  // Order Not Found
  if (
    cleanCode === '25204' ||
    cleanCode === '40725' ||
    cleanCode === '24056' ||
    lowerMsg.includes('order not exist') ||
    lowerMsg.includes('order not found') ||
    lowerMsg.includes('order does not exist')
  ) {
    return {
      category: 'ORDER_NOT_FOUND',
      code: cleanCode,
      message: rawMsg || 'Order does not exist or has already completed/cancelled.',
      actionableGuidance: 'Check open orders or verify execution state using clientOid.',
      canRetry: false,
    };
  }

  // Permission Denied / Scope Mismatch
  if (cleanCode === '40015' || lowerMsg.includes('permission denied') || lowerMsg.includes('authority')) {
    return {
      category: 'PERMISSION_DENIED',
      code: cleanCode,
      message: rawMsg || 'Bitget API key lacks the required Trade permissions.',
      actionableGuidance: 'Edit your API key in the Bitget API management console to enable "Trade" permissions.',
      canRetry: false,
    };
  }

  // Leverage Exceeded
  if (cleanCode === '40812' || lowerMsg.includes('leverage exceeds') || lowerMsg.includes('max leverage')) {
    return {
      category: 'LEVERAGE_EXCEEDED',
      code: cleanCode,
      message: rawMsg || 'Leverage multiple exceeds maximum allowable limit for this instrument/tier.',
      actionableGuidance: 'Reduce the leverage multiple to match the instrument tier rules.',
      canRetry: false,
    };
  }

  // Order Parameter or Size Limits
  if (
    cleanCode === '43025' ||
    cleanCode === '43026' ||
    cleanCode === '43004' ||
    cleanCode === '43009' ||
    cleanCode === '40808' ||
    lowerMsg.includes('size') ||
    lowerMsg.includes('quantity') ||
    lowerMsg.includes('leverage') ||
    lowerMsg.includes('min notional')
  ) {
    return {
      category: 'ORDER_INVALID',
      code: cleanCode,
      message: rawMsg || 'Order size or parameters exceed Bitget market constraints.',
      actionableGuidance:
        'Adjust the trade size or price to meet minimum notional/tick size constraints.',
      canRetry: false,
    };
  }

  // Rate Limiting
  if (cleanCode === '40800' || cleanCode === '429' || lowerMsg.includes('rate limit') || lowerMsg.includes('too many')) {
    return {
      category: 'RATE_LIMITED',
      code: cleanCode,
      message: rawMsg || 'Bitget API rate limit exceeded.',
      actionableGuidance: 'Wait a few seconds before retrying the request.',
      canRetry: true,
    };
  }

  // Classic Account Mode Error
  if (cleanCode === '40084' || lowerMsg.includes('classic account')) {
    return {
      category: 'AUTH_FAILED',
      code: cleanCode,
      message: 'Account is in Classic mode. Unified Trading Account (UTA) API is required.',
      actionableGuidance:
        'Please upgrade your Bitget account to Unified Trading Account (UTA) in your Bitget web/app account settings.',
      canRetry: false,
    };
  }

  // Demo vs Live Environment Mismatch
  if (cleanCode === '40099' || lowerMsg.includes('exchange environment is incorrect')) {
    return {
      category: 'AUTH_FAILED',
      code: cleanCode,
      message: 'Bitget API environment mismatch (Live vs Demo/Simulation).',
      actionableGuidance:
        'If using Live API credentials, set BITGET_DEMO_TRADING=false in .env.local. If using Paper Trading keys, set BITGET_DEMO_TRADING=true.',
      canRetry: false,
    };
  }

  // Default Exchange Error
  return {
    category: 'EXCHANGE_ERROR',
    code: cleanCode,
    message: rawMsg || `Bitget API returned error code ${cleanCode}.`,
    actionableGuidance: 'Check the parameters and try again or consult Bitget API documentation.',
    canRetry: false,
  };
}
