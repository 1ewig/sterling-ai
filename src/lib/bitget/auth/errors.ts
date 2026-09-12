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
    cleanCode === '43012' ||
    cleanCode === '43013' ||
    cleanCode === '40754' ||
    lowerMsg.includes('balance') ||
    lowerMsg.includes('insufficient')
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

  // Order Parameter or Size Limits
  if (
    cleanCode === '43025' ||
    cleanCode === '43026' ||
    cleanCode === '43004' ||
    cleanCode === '43009' ||
    lowerMsg.includes('size') ||
    lowerMsg.includes('quantity') ||
    lowerMsg.includes('leverage')
  ) {
    return {
      category: 'ORDER_INVALID',
      code: cleanCode,
      message: rawMsg || 'Order size or leverage exceeds Bitget market constraints.',
      actionableGuidance:
        'Adjust the trade size to meet minimum contract step requirements or lower the leverage multiple.',
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

  // Default Exchange Error
  return {
    category: 'EXCHANGE_ERROR',
    code: cleanCode,
    message: rawMsg || `Bitget API returned error code ${cleanCode}.`,
    actionableGuidance: 'Check the parameters and try again or consult Bitget API documentation.',
    canRetry: false,
  };
}
