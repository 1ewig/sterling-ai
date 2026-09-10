import { Globe, Sparkles } from 'lucide-react';
import type { ToolDisplayInfo } from './types';

/**
 * Derives natural, humanized tool titles and contextual icons using tool arguments.
 */
export function getToolDisplayInfo(
  toolName?: string,
  toolArgs?: Record<string, unknown>
): ToolDisplayInfo {
  const normalizedName = toolName ?? '';
  const query = typeof toolArgs?.query === 'string' ? toolArgs.query : undefined;
  const symbol = typeof toolArgs?.symbol === 'string' ? toolArgs.symbol.toUpperCase() : undefined;

  switch (normalizedName) {
    case 'web_search':
    case 'search_crypto_news':
      return {
        title: query ? `Searching web for "${query}"` : 'Searching the web',
        icon: Globe,
        symbol: query || symbol,
      };
    default:
      return {
        title: normalizedName ? normalizedName.replace(/_/g, ' ') : 'tool',
        icon: Sparkles,
        symbol: query || symbol,
      };
  }
}
