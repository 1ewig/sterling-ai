import { webSearchTool } from './web-search';
import { newsBriefingTool } from './news-briefing';
import { marketDataTool } from './market-data';
import { technicalAnalysisTool } from './technical-analysis';
import { macroAnalystTool } from './macro-analyst';
import { sentimentAnalystTool } from './sentiment-analyst';
import { marketIntelTool } from './market-intel';
import { stageTradeOrderTool } from './trade-order';
import { accountOverviewTool } from './account-positions';
import { getOpenOrdersTool, cancelOrderTool, closePositionTool } from './order-management';

/**
 * Registry of all agent tools (12 tools total: 7 market/macro intel + 5 trading execution tools).
 */
export const agentTools = {
  web_search: webSearchTool,
  news_briefing: newsBriefingTool,
  market_data: marketDataTool,
  technical_analysis: technicalAnalysisTool,
  macro_analyst: macroAnalystTool,
  sentiment_analyst: sentimentAnalystTool,
  market_intel: marketIntelTool,
  // 5 Dedicated Trading Tools
  get_account_overview: accountOverviewTool,
  stage_trade_order: stageTradeOrderTool,
  get_open_orders: getOpenOrdersTool,
  cancel_order: cancelOrderTool,
  close_position: closePositionTool,
};

export type AgentTools = typeof agentTools;

/**
 * Returns the tools dictionary for the AI SDK stream runner.
 */
export function getAgentTools(): AgentTools {
  return agentTools;
}

export {
  webSearchTool,
  newsBriefingTool,
  marketDataTool,
  technicalAnalysisTool,
  macroAnalystTool,
  sentimentAnalystTool,
  marketIntelTool,
  stageTradeOrderTool,
  accountOverviewTool,
  getOpenOrdersTool,
  cancelOrderTool,
  closePositionTool,
};



