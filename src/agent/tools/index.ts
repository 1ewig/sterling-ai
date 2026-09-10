import { webSearchTool } from './web-search';

/**
 * Registry of all agent tools.
 * 
 * To add a new tool:
 * 1. Create a new file in `src/agent/tools/<tool-name>.ts`
 * 2. Import and add it to `agentTools` below.
 */
export const agentTools = {
  web_search: webSearchTool,
  search_crypto_news: webSearchTool, // Backwards-compatible alias
};

export type AgentTools = typeof agentTools;

/**
 * Returns the tools dictionary for the AI SDK stream runner.
 */
export function getAgentTools(): AgentTools {
  return agentTools;
}

// Export individual tools for direct access if needed
export { webSearchTool };
