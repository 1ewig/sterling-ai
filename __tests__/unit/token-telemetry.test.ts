import { describe, test, expect } from 'bun:test';
import type { TokenUsage, AgentResult } from '@/agent/types';

describe('Token Telemetry & Real-World Context Window Suite', () => {
  test('single step inference equates context usage directly to billed usage', () => {
    const step1Usage: TokenUsage = {
      inputTokens: 4200,
      outputTokens: 350,
      totalTokens: 4550,
      reasoningTokens: 20,
    };

    const stepUsages: TokenUsage[] = [step1Usage];
    const totalUsage: TokenUsage = {
      inputTokens: 4200,
      outputTokens: 350,
      totalTokens: 4550,
      reasoningTokens: 20,
    };

    const billedUsage: TokenUsage = totalUsage;
    const lastStep = stepUsages[stepUsages.length - 1];
    const contextUsage: TokenUsage = lastStep ? { ...lastStep } : billedUsage;

    expect(contextUsage.totalTokens).toBe(4550);
    expect(billedUsage.totalTokens).toBe(4550);
    expect(contextUsage.totalTokens).toBe(billedUsage.totalTokens);
  });

  test('multi-step execution distinguishes active context window from cumulative billed tokens', () => {
    // Step 1: Initial prompt + tool call
    const step1Usage: TokenUsage = {
      inputTokens: 4350,
      outputTokens: 75,
      totalTokens: 4425,
      reasoningTokens: 5,
    };

    // Step 2: Full context re-sent with tool payload + final synthesis
    const step2Usage: TokenUsage = {
      inputTokens: 4570,
      outputTokens: 380,
      totalTokens: 4950,
      reasoningTokens: 8,
    };

    const stepUsages: TokenUsage[] = [step1Usage, step2Usage];

    // Cumulative provider usage across all HTTP requests
    const billedUsage: TokenUsage = {
      inputTokens: step1Usage.inputTokens + step2Usage.inputTokens, // 8920
      outputTokens: step1Usage.outputTokens + step2Usage.outputTokens, // 455
      totalTokens: step1Usage.totalTokens + step2Usage.totalTokens, // 9375
      reasoningTokens: (step1Usage.reasoningTokens ?? 0) + (step2Usage.reasoningTokens ?? 0), // 13
    };

    // Active real-world context window used at the conclusion of generation (last step)
    const lastStep = stepUsages[stepUsages.length - 1];
    const contextUsage: TokenUsage = lastStep ? { ...lastStep } : billedUsage;

    expect(contextUsage.totalTokens).toBe(4950);
    expect(contextUsage.inputTokens).toBe(4570);
    expect(contextUsage.outputTokens).toBe(380);

    expect(billedUsage.totalTokens).toBe(9375);
    expect(billedUsage.inputTokens).toBe(8920);
    expect(billedUsage.outputTokens).toBe(455);

    // Context used represents the active window, avoiding artificial inflation
    expect(contextUsage.totalTokens).toBeLessThan(billedUsage.totalTokens);
  });

  test('AgentResult accepts both usage (active context) and billedUsage', () => {
    const result: AgentResult = {
      symbol: 'BTCUSDT',
      analysis: 'BTC analysis',
      toolCalls: [],
      steps: [],
      stepCount: 2,
      timestamp: Date.now(),
      usage: {
        inputTokens: 4570,
        outputTokens: 380,
        totalTokens: 4950,
      },
      billedUsage: {
        inputTokens: 8920,
        outputTokens: 455,
        totalTokens: 9375,
      },
    };

    expect(result.usage?.totalTokens).toBe(4950);
    expect(result.billedUsage?.totalTokens).toBe(9375);
  });
});
