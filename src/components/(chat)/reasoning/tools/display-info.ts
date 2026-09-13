import {
  Globe,
  DollarSign,
  Activity,
  Gauge,
  Layers,
  Sparkles,
  ShieldCheck,
  Wallet,
  Newspaper,
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
  const topic = typeof toolArgs?.topic === 'string' ? toolArgs.topic : undefined;
  const symbol = typeof toolArgs?.symbol === 'string' ? toolArgs.symbol.toUpperCase() : undefined;
  const focus = typeof toolArgs?.focus === 'string' ? toolArgs.focus : undefined;
  const side = typeof toolArgs?.side === 'string' ? toolArgs.side.toUpperCase() : undefined;

  switch (normalizedName) {
    case 'news_briefing':
      return {
        title: symbol ? `News Briefing: ${symbol} & Market Catalysts` : `News Briefing: ${topic || 'Market Headlines'}`,
        icon: Newspaper,
        symbol: symbol || topic,
      };

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

    case 'stage_trade_order':
      return {
        title: symbol ? `Staging ${side || ''} Trade Ticket for ${symbol}` : 'Staging Trade Order Ticket',
        icon: ShieldCheck,
        symbol,
      };

    case 'get_account_overview':
      return {
        title: 'Bitget v3 Account Overview & Positions',
        icon: Wallet,
      };

    case 'get_open_orders':
      return {
        title: symbol ? `Querying Open Orders for ${symbol}` : 'Querying Bitget Working Orders',
        icon: Layers,
        symbol,
      };

    case 'cancel_order':
      return {
        title: symbol ? `Staging Cancel Order for ${symbol}` : 'Staging Order Cancellation',
        icon: ShieldCheck,
        symbol,
      };

    case 'close_position':
      return {
        title: symbol ? `Staging Market Exit for ${symbol}` : 'Staging Position Close',
        icon: ShieldCheck,
        symbol,
      };

    default:
      return {
        title: normalizedName ? normalizedName.replace(/_/g, ' ') : 'tool',
        icon: Sparkles,
        symbol: query || symbol,
      };
  }
}

