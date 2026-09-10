import {
  Globe,
  DollarSign,
  Activity,
  Gauge,
  Layers,
  Newspaper,
  Sparkles,
} from 'lucide-react';
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
  const focus = typeof toolArgs?.focus === 'string' ? toolArgs.focus : undefined;
  const topic = typeof toolArgs?.topic === 'string' ? toolArgs.topic : undefined;

  switch (normalizedName) {
    case 'web_search':
    case 'search_crypto_news':
      return {
        title: query ? `Searching web for "${query}"` : 'Searching the web',
        icon: Globe,
        symbol: query || symbol,
      };

    case 'market_data':
      return {
        title: symbol ? `Fetching ${symbol} Live Quote & Depth` : 'Querying Bitget Market Data',
        icon: DollarSign,
        symbol,
      };

    case 'technical_analysis':
      return {
        title: symbol ? `Analyzing ${symbol} Technical Indicators` : 'Computing Technical Analysis',
        icon: Activity,
        symbol,
      };

    case 'macro_analyst':
      return {
        title: focus && focus !== 'full' ? `Macro Analyst: ${focus.replace('_', ' ')}` : 'Macro Analyst: Yield Curve & Fed Policy',
        icon: Globe,
        symbol: focus,
      };

    case 'sentiment_analyst':
      return {
        title: symbol ? `Sentiment Analyst: ${symbol} Positioning` : 'Sentiment & Fear/Greed Analysis',
        icon: Gauge,
        symbol,
      };

    case 'market_intel':
      return {
        title: 'Market Intel: DeFi TVL & On-Chain Flows',
        icon: Layers,
      };

    case 'news_briefing':
      return {
        title: topic ? `News Briefing: "${topic}"` : 'Aggregating Market Catalysts & News',
        icon: Newspaper,
        symbol: topic,
      };

    default:
      return {
        title: normalizedName ? normalizedName.replace(/_/g, ' ') : 'tool',
        icon: Sparkles,
        symbol: query || symbol,
      };
  }
}
