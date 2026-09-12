import { webSearchTool } from './web-search';
import { marketDataTool } from './market-data';
import { technicalAnalysisTool } from './technical-analysis';
import { macroAnalystTool } from './macro-analyst';
import { sentimentAnalystTool } from './sentiment-analyst';
import { marketIntelTool } from './market-intel';
import { stageTradeOrderTool } from './trade-order';
import { accountOverviewTool } from './account-positions';

/**
 * Registry of all agent tools.
 */
export const agentTools = {
  web_search: webSearchTool,
  market_data: marketDataTool,
  technical_analysis: technicalAnalysisTool,
  macro_analyst: macroAnalystTool,
  sentiment_analyst: sentimentAnalystTool,
  market_intel: marketIntelTool,
  stage_trade_order: stageTradeOrderTool,
  get_account_overview: accountOverviewTool,
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
  marketDataTool,
  technicalAnalysisTool,
  macroAnalystTool,
  sentimentAnalystTool,
  marketIntelTool,
  stageTradeOrderTool,
  accountOverviewTool,
};


