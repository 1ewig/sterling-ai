import { streamText, isStepCount, smoothStream } from 'ai';
import { prepareAgentInvocation } from './prepare-invocation';
import { AgentStreamStateMachine } from './stream-state-machine';
import { extractSessionTitle } from '../transforms/title-stream-filter';
import { extractFollowUpQuestions } from '../transforms/follow-up-extractor';
import { stripIntermediateTextPrefix } from '../transforms/sanitizer';
import type { AgentOptions, AgentResult, AgentStreamEvent, TokenUsage } from '../types';


/**
 * Executes an autonomous multi-step agent reasoning stream using Vercel AI SDK.
 * Emits real-time SSE events for thinking deltas, tool executions, and stream output.
 */
export async function executeAgentStream(
  options: AgentOptions,
  onEvent: (event: AgentStreamEvent) => void
): Promise<AgentResult> {
  const { maxSteps = 5, symbol, abortSignal } = options;
  const {
    model,
    backupModel,
    tools,
    effectiveSystemPrompt,
    currentUserPrompt,
    messages,
    reasoningEffort,
    maxTokens,
  } = prepareAgentInvocation(options);

  const startTime = Date.now();
  let accumulatedText = '';
  let emittedTitle: string | undefined;
  let hasProducedOutput = false;

  let totalUsage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
  const stepUsages: TokenUsage[] = [];

  const handleEvent = (event: AgentStreamEvent) => {
    if (event.type === 'clear_text') {
      accumulatedText = '';
    }
    onEvent(event);
  };

  const stateMachine = new AgentStreamStateMachine(handleEvent);

  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `\n🤖 [Argus:ChatAgent] Started | Symbol: ${symbol ?? 'GLOBAL'} | MaxSteps: ${maxSteps}`
    );
    console.log(
      `   Prompt: "${options.prompt.slice(0, 100)}${options.prompt.length > 100 ? '...' : ''}"`
    );
  }

  const buildStreamParams = (activeModel: typeof model) => ({
    model: activeModel,
    system: effectiveSystemPrompt,
    ...(messages ? { messages } : { prompt: currentUserPrompt }),
    tools,
    maxTokens,
    abortSignal,
    stopWhen: isStepCount(maxSteps),
    experimental_transform: smoothStream({
      delayInMs: 15,
      chunking: 'word',
    }),
    providerOptions: {
      groq: { reasoningEffort: reasoningEffort === 'max' ? 'high' : reasoningEffort },
      fireworks: {
        thinking: { type: 'enabled' as const },
        ...(reasoningEffort !== 'none' && reasoningEffort !== 'default'
          ? { reasoningEffort }
          : {}),
      },
    },
  });

  const runStreamWithModel = async (activeModel: typeof model) => {
    const streamResult = streamText(buildStreamParams(activeModel));
    let stepCount = 0;

    for await (const part of streamResult.fullStream) {
      if (part.type === 'error') {
        throw part.error;
      }

      if (part.type === 'start-step') {
        stepCount++;
        stateMachine.onStartStep();
      } else if (part.type === 'reasoning-delta') {
        hasProducedOutput = true;
        stateMachine.onReasoningDelta(part.text);
      } else if (part.type === 'tool-call') {
        hasProducedOutput = true;
        stateMachine.onToolCall(part);
      } else if (part.type === 'tool-result') {
        stateMachine.onToolResult(part);
      } else if (part.type === 'tool-error' || part.type === 'tool-output-denied') {
        stateMachine.onToolError(part);
      } else if (part.type === 'text-delta') {
        hasProducedOutput = true;
        stateMachine.onTextDelta(part.text);
        accumulatedText += part.text;
        handleEvent({ type: 'text_delta', delta: part.text });

        if (!emittedTitle) {
          const match = accumulatedText.match(/<session_title>([\s\S]*?)<\/session_title>/i);
          if (match && match[1]) {
            emittedTitle = match[1].replace(/^["'`]+|["'`]+$/g, '').trim();
            if (emittedTitle) {
              handleEvent({ type: 'session_title', title: emittedTitle });
            }
          }
        }
      } else if (part.type === 'finish-step') {
        const inputTokens = part.usage.inputTokens ?? 0;
        const outputTokens = part.usage.outputTokens ?? 0;
        const stepTotalTokens = part.usage.totalTokens ?? inputTokens + outputTokens;
        const reasoningTokens = part.usage.outputTokenDetails?.reasoningTokens;

        const stepUsage: TokenUsage = {
          inputTokens,
          outputTokens,
          totalTokens: stepTotalTokens,
          ...(reasoningTokens ? { reasoningTokens } : {}),
        };
        stepUsages.push(stepUsage);
        stateMachine.onFinishStep(stepUsage);

        if (process.env.NODE_ENV !== 'production') {
          const reasoningStr = reasoningTokens ? `, reasoning: ${reasoningTokens}` : '';
          console.log(
            `   📊 [Step ${stepCount} Tokens]: ${stepTotalTokens} (input: ${inputTokens}, output: ${outputTokens}${reasoningStr})`
          );
        }
      } else if (part.type === 'finish') {
        const inputTokens = part.totalUsage.inputTokens ?? 0;
        const outputTokens = part.totalUsage.outputTokens ?? 0;
        const fullTotalTokens = part.totalUsage.totalTokens ?? inputTokens + outputTokens;
        const reasoningTokens = part.totalUsage.outputTokenDetails?.reasoningTokens;

        totalUsage = {
          inputTokens,
          outputTokens,
          totalTokens: fullTotalTokens,
          ...(reasoningTokens ? { reasoningTokens } : {}),
        };
      }
    }
  };

  try {
    try {
      await runStreamWithModel(model);
    } catch (primaryErr) {
      if (abortSignal?.aborted) {
        throw primaryErr;
      }
      if (!hasProducedOutput && backupModel) {
        console.warn('Primary model error, failing over to backup model:', primaryErr);
        stateMachine.markActiveStepsFailed('Switched to backup model');
        await runStreamWithModel(backupModel);
      } else {
        throw primaryErr;
      }
    }
  } catch (err) {
    stateMachine.markActiveStepsFailed();
    throw err;
  }

  // Ensure any dangling active steps are cleanly finalized
  const steps = stateMachine.finalizeSteps();
  const executedToolCalls = stateMachine.getExecutedToolCalls();

  // If totalUsage was not emitted in 'finish' event, sum all step usages
  const finalUsage: TokenUsage =
    totalUsage.totalTokens > 0
      ? totalUsage
      : stepUsages.reduce(
          (acc, u) => ({
            inputTokens: acc.inputTokens + u.inputTokens,
            outputTokens: acc.outputTokens + u.outputTokens,
            totalTokens: acc.totalTokens + u.totalTokens,
            reasoningTokens: (acc.reasoningTokens ?? 0) + (u.reasoningTokens ?? 0),
          }),
          { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
        );

  const effectiveIsFirstTurn =
    options.isFirstTurn ?? (!options.history || options.history.length === 0);

  const { sessionTitle, cleanedText: textWithoutTitle } = extractSessionTitle(
    accumulatedText,
    emittedTitle,
    options.prompt,
    effectiveIsFirstTurn
  );

  const { followUpQuestions, cleanedText } = extractFollowUpQuestions(
    textWithoutTitle
  );

  const cleanAnalysis = stripIntermediateTextPrefix(cleanedText, steps);
  const workedDurationMs = Math.max(1000, Date.now() - startTime);

  const finalResult: AgentResult = {
    symbol: symbol?.toUpperCase(),
    sessionTitle,
    analysis: cleanAnalysis,
    followUpQuestions,
    toolCalls: executedToolCalls,
    steps,
    stepCount: steps.length,
    workedDurationMs,
    timestamp: Date.now(),
    usage: finalUsage,
  };

  if (process.env.NODE_ENV !== 'production') {
    const totalReasoningStr = finalUsage.reasoningTokens ? `, reasoning: ${finalUsage.reasoningTokens}` : '';
    console.log(
      `🏁 [Argus:ChatAgent] Finished in ${workedDurationMs}ms (${steps.length} steps, ${executedToolCalls.length} tools)`
    );
    console.log(
      `   📊 [Total Tokens]: ${finalUsage.totalTokens} (input: ${finalUsage.inputTokens}, output: ${finalUsage.outputTokens}${totalReasoningStr})`
    );
    if (sessionTitle) {
      console.log(`   🏷️ [Session Title]: "${sessionTitle}"`);
    }
  }

  handleEvent({ type: 'done', result: finalResult });
  return finalResult;
}
