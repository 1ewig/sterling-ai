import { z } from 'zod';

/**
 * Chat history message for multi-turn conversational context
 */
export const HistoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export type HistoryMessage = z.infer<typeof HistoryMessageSchema>;

/**
 * Token usage telemetry for an execution step or complete conversation run
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  reasoningTokens?: number;
}

/**
 * Telemetry record for an executed tool call within the agent reasoning loop
 */
export interface ExecutedToolCall {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
}

/**
 * Step type for the real-time reasoning and tool execution process
 */
export type AgentStepType = 'thinking' | 'tool' | 'intermediate_text';

/**
 * An individual lifecycle step in the agent's real-time reasoning timeline
 */
export interface AgentExecutionStep {
  id: string;
  type: AgentStepType;
  label: string;
  toolName?: string;
  reasoningText?: string;
  intermediateText?: string;
  status: 'active' | 'completed' | 'error';
  timestamp: number;
  durationMs?: number;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  usage?: TokenUsage;
}

/**
 * Real-time SSE streaming events emitted during agent execution
 */
export type AgentStreamEvent =
  | { type: 'step_start'; step: AgentExecutionStep }
  | {
      type: 'step_update';
      stepId: string;
      status?: 'completed' | 'error';
      durationMs?: number;
      label?: string;
      reasoningText?: string;
      intermediateText?: string;
      toolArgs?: Record<string, unknown>;
      toolResult?: unknown;
      usage?: TokenUsage;
    }
  | { type: 'reasoning_delta'; stepId: string; delta: string }
  | { type: 'text_delta'; delta: string }
  | { type: 'clear_text' }
  | { type: 'session_title'; title: string }
  | { type: 'done'; result: AgentResult }
  | { type: 'error'; message: string };

/**
 * Invocation options for the agent execution engine
 */
export interface AgentOptions {
  prompt: string;
  symbol?: string;
  provider?: 'groq' | 'fireworks';
  modelName?: string;
  backupModelName?: string;
  apiKey?: string;
  history?: HistoryMessage[];
  maxSteps?: number;
  maxTokens?: number;
  isFirstTurn?: boolean;
  systemDirective?: string;
  abortSignal?: AbortSignal;
}

/**
 * Structured result returned by the agent execution engine
 */
export interface AgentResult {
  symbol?: string;
  sessionTitle?: string;
  analysis: string;
  followUpQuestions?: string[];
  toolCalls: ExecutedToolCall[];
  steps: AgentExecutionStep[];
  stepCount: number;
  workedDurationMs?: number;
  timestamp: number;
  usage?: TokenUsage;
}

/**
 * Zod schema for runtime validation of incoming HTTP chat requests to the agent
 */
export const AgentChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  symbol: z.string().optional(),
  apiKey: z.string().optional(),
  history: z.array(HistoryMessageSchema).optional(),
  isFirstTurn: z.boolean().optional(),
});

export type AgentChatRequest = z.infer<typeof AgentChatRequestSchema>;

/**
 * Calculated Technical Indicator Result
 */
export interface TechnicalIndicatorReport {
  symbol: string;
  granularity: string;
  currentPrice: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  indicators: {
    rsi14: number;
    rsiSignal: 'overbought' | 'oversold' | 'neutral';
    macd: {
      dif: number;
      dea: number;
      hist: number;
      signal: 'bullish_cross' | 'bearish_cross' | 'bullish_momentum' | 'bearish_momentum' | 'neutral';
    };
    ema: {
      ema20: number;
      ema50: number;
      ema200?: number;
      alignment: 'bullish' | 'bearish' | 'mixed';
    };
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
      bandwidth: number;
      position: 'above_upper' | 'below_lower' | 'inside';
    };
    superTrend: {
      value: number;
      direction: 'bullish' | 'bearish';
    };
    fibonacci: {
      high: number;
      low: number;
      fib236: number;
      fib382: number;
      fib500: number;
      fib618: number;
      fib786: number;
      currentZone: string;
    };
    atr14: number;
  };
  summary: string;
}

/**
 * Macro Analyst Intelligence Payload
 */
export interface MacroAnalystData {
  verdict: 'RISK-ON' | 'MIXED' | 'RISK-OFF';
  rates: {
    fedFundsTarget?: string;
    t2y?: string;
    t10y?: string;
    spread10y2y?: string;
    yieldCurveInverted?: boolean;
    mortgage30y?: string;
  };
  indicators: {
    cpi?: string;
    corePce?: string;
    unemployment?: string;
    gdpGrowth?: string;
    nonfarmPayrolls?: string;
  };
  correlations: {
    btcGold?: string;
    btcDxy?: string;
    btcNdx?: string;
    btcSpx?: string;
  };
  globalPrices: {
    dxy?: string;
    vix?: string;
    spx?: string;
    ndx?: string;
    gold?: string;
  };
  upcomingCatalysts?: string[];
  summary: string;
}

/**
 * Sentiment Analyst Intelligence Payload
 */
export interface SentimentAnalystData {
  fearAndGreedIndex: {
    current: number;
    sentiment: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
    historicalAvg14d?: number;
  };
  derivatives: {
    symbol: string;
    retailLongShortRatio?: number;
    topTraderLongShortRatio?: number;
    divergence?: 'Smart money long, retail short' | 'Retail long, smart money short' | 'Aligned Long' | 'Aligned Short' | 'Balanced';
    takerBuyRatio?: number;
    openInterest?: string;
    fundingRate?: string;
  };
  positioningRisk: 'High Squeeze Risk' | 'Overleveraged Bulls' | 'Overleveraged Bears' | 'Moderate / Balanced';
  summary: string;
}

/**
 * Market Intelligence Payload
 */
export interface MarketIntelData {
  defi: {
    totalTvl?: string;
    topChains?: Array<{ name: string; tvl: string; share: string }>;
    stablecoinSupply?: string;
  };
  dexTrending?: Array<{
    symbol: string;
    name: string;
    price: string;
    change24h: string;
    volume24h?: string;
    chain?: string;
  }>;
  networkHealth?: {
    ethGasGwei?: number;
    btcHalfHourFeeSat?: number;
    btcPendingTx?: number;
  };
  summary: string;
}

/**
 * Zod schemas for tool parameters
 */
export const marketDataParamsSchema = z.object({
  symbol: z.string().describe('Trading pair symbol, e.g. BTCUSDT, ETHUSDT, TSLAUSDT, NVDAUSDT, SPYUSDT'),
  productType: z.enum(['spot', 'usdt-futures']).default('usdt-futures').describe('Product market type (spot or usdt-futures)'),
});

export const technicalAnalysisParamsSchema = z.object({
  symbol: z.string().default('BTCUSDT').describe('Trading pair symbol (e.g. BTCUSDT, ETHUSDT, TSLAUSDT)'),
  granularity: z.enum(['15min', '1h', '4h', '1d', '1w']).default('4h').describe('Candlestick timeframe'),
  limit: z.number().min(30).max(200).default(100).describe('Number of candlestick bars to analyze (default 100)'),
});

export const macroAnalystParamsSchema = z.object({
  focus: z.enum(['full', 'yield_curve', 'inflation_jobs', 'cross_asset', 'tech_earnings']).default('full').describe('Specific macro focus area or full overview'),
});

export const sentimentAnalystParamsSchema = z.object({
  symbol: z.string().default('BTCUSDT').describe('Trading pair symbol for derivatives positioning (e.g. BTCUSDT, ETHUSDT, SOLUSDT)'),
  timeframe: z.enum(['1h', '4h', '1d']).default('4h').describe('Lookback window for Long/Short and Taker ratios'),
});

export const marketIntelParamsSchema = z.object({
  scope: z.enum(['all', 'defi_tvl', 'dex_trending', 'network_health', 'stablecoins']).default('all').describe('Market intelligence dimension to query'),
});
