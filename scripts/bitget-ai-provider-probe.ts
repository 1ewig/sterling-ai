import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool, wrapLanguageModel, extractReasoningMiddleware, isStepCount } from 'ai';
import { z } from 'zod';

const BITGET_AI_BASE_URL = process.env.BITGET_AI_BASE_URL || 'https://hackathon.bitgetops.com/v1';
const BITGET_AI_API_KEY = process.env.BITGET_AI_API_KEY;
if (!BITGET_AI_API_KEY) {
  console.error('❌ Error: BITGET_AI_API_KEY is not set in .env.local');
  process.exit(1);
}
const MODEL_NAME = process.env.BITGET_AI_MODEL || 'qwen3.8-max';

console.log('='.repeat(70));
console.log('⚡ BITGET AI PROVIDER PROBE: Testing qwen3.8-max (Balanced Thinking)');
console.log(`Endpoint: ${BITGET_AI_BASE_URL}`);
console.log(`Model:    ${MODEL_NAME}`);
console.log('='.repeat(70));

const bitget = createOpenAI({
  name: 'bitget',
  baseURL: BITGET_AI_BASE_URL,
  apiKey: BITGET_AI_API_KEY,
});

// Wrap with reasoning extraction middleware to capture thinking deltas (<think> tags)
const rawModel = bitget.chat(MODEL_NAME);
const thinkingWrappedModel = wrapLanguageModel({
  model: rawModel,
  middleware: extractReasoningMiddleware({ tagName: 'think' }),
});

// Define dummy trading tools using AI SDK v7 inputSchema standard
const testTools = {
  get_market_price: tool({
    description: 'Fetch real-time ticker price and 24h stats for a trading pair',
    inputSchema: z.object({
      symbol: z.string().describe('Trading pair symbol, e.g. BTCUSDT'),
    }),
    execute: async ({ symbol }) => {
      console.log(`\n  [Tool Execution] Executing get_market_price for ${symbol}...`);
      return {
        symbol,
        lastPrice: '94250.50',
        high24h: '95800.00',
        low24h: '93100.00',
        volume24h: '18420.55',
        fundingRate: '+0.0085%',
      };
    },
  }),
  stage_trade_order: tool({
    description: 'Stage an HMAC-signed order ticket for Bitget UTA v3',
    inputSchema: z.object({
      symbol: z.string(),
      side: z.enum(['buy', 'sell']),
      orderType: z.enum(['limit', 'market']),
      size: z.number(),
      price: z.number().optional(),
      stopLossPrice: z.number().optional(),
      takeProfitPrice: z.number().optional(),
      rationale: z.string(),
    }),
    execute: async (params) => {
      console.log(`\n  [Tool Execution] Executing stage_trade_order with params:`, JSON.stringify(params, null, 2));
      return {
        ticketId: 'tkt_probe_98765',
        status: 'staged',
        symbol: params.symbol,
        side: params.side,
        size: params.size,
        entryPrice: params.price ?? 94250.5,
        stopLoss: params.stopLossPrice,
        takeProfit: params.takeProfitPrice,
        hmacSignature: 'hmac_valid_token_test_probe',
      };
    },
  }),
};

async function runProbe() {
  console.log('\n▶ Step 1: Testing Streaming + Thinking Deltas + Tool Calling...');

  let thinkingDeltasCount = 0;
  let textDeltasCount = 0;
  let toolCallsCount = 0;
  let toolResultsCount = 0;
  let collectedThinking = '';
  let collectedText = '';

  try {
    const streamResult = streamText({
      model: thinkingWrappedModel,
      tools: testTools,
      stopWhen: isStepCount(3),
      system: `You are Sterling, an institutional AI trading desk analyst. You think methodically before taking actions. Always verify live market price with get_market_price before staging any trade with stage_trade_order.`,
      prompt: `Check the current price for BTCUSDT. If it's above $90,000, stage a limit buy of 0.1 BTC at $93,500 with a stop-loss at $91,000 and take-profit at $99,000. Give a brief rationale.`,
      providerOptions: {
        openai: {
          reasoningEffort: 'low',
        },
      },
    });

    console.log('\n--- Stream Event Breakdown ---\n');

    for await (const part of streamResult.fullStream) {
      if (part.type === 'reasoning-delta') {
        thinkingDeltasCount++;
        collectedThinking += part.text;
        process.stdout.write(`\x1b[35m${part.text}\x1b[0m`);
      } else if (part.type === 'text-delta') {
        textDeltasCount++;
        collectedText += part.text;
        process.stdout.write(`\x1b[32m${part.text}\x1b[0m`);
      } else if (part.type === 'tool-call') {
        toolCallsCount++;
        console.log(`\n\x1b[36m[TOOL CALL #${toolCallsCount}] Tool: ${part.toolName}, Input: ${JSON.stringify(part.input)}\x1b[0m`);
      } else if (part.type === 'tool-result') {
        toolResultsCount++;
        console.log(`\x1b[33m[TOOL RESULT #${toolResultsCount}] Output: ${JSON.stringify(part.output).slice(0, 150)}...\x1b[0m`);
      } else if (part.type === 'error') {
        console.error(`\n\x1b[31m[STREAM ERROR] ${part.error}\x1b[0m`);
      } else if (part.type === 'finish-step') {
        console.log(`\n\x1b[34m[STEP FINISH] Step finished with usage: ${JSON.stringify(part.usage)}\x1b[0m`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 PROBE RESULTS SUMMARY');
    console.log('='.repeat(70));
    console.log(`- Thinking / Reasoning Deltas Received: ${thinkingDeltasCount} chunks (${collectedThinking.length} chars)`);
    console.log(`- Text Deltas Received:                 ${textDeltasCount} chunks (${collectedText.length} chars)`);
    console.log(`- Tool Calls Executed:                  ${toolCallsCount}`);
    console.log(`- Tool Results Returned:                ${toolResultsCount}`);

    const hasThinking = thinkingDeltasCount > 0 || collectedThinking.length > 0;
    const hasTools = toolCallsCount >= 2;

    console.log('\nVerification Status:');
    console.log(`  [${hasThinking ? '✓ PASS' : '⚠ NOTICE'}] Thinking/Reasoning capture`);
    console.log(`  [${hasTools ? '✓ PASS' : '✗ FAIL'}] Tool calling & multi-step execution`);

  } catch (err: unknown) {
    console.error('\n❌ Probe failed with error:', err);
  }
}

runProbe();
