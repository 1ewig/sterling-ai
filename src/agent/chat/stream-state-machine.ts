import { sanitizeAgentText } from '../transforms/sanitizer';
import type {
  AgentExecutionStep,
  ExecutedToolCall,
  AgentStreamEvent,
  TokenUsage,
} from '../types';

/**
 * Manages the live lifecycle and state transitions of execution steps
 * (thinking, intermediate text, tool calls, and results) during SSE streaming.
 */
export class AgentStreamStateMachine {
  private steps: AgentExecutionStep[] = [];
  private executedToolCalls: ExecutedToolCall[] = [];
  private activeThinkingStepId: string | null = null;
  private currentStepPreToolText = '';

  constructor(private readonly onEvent: (event: AgentStreamEvent) => void) {}

  onReasoningDelta(text: string): void {
    let activeThinking = this.activeThinkingStepId
      ? this.steps.find((s) => s.id === this.activeThinkingStepId && s.type === 'thinking')
      : null;

    if (!activeThinking || activeThinking.status !== 'active') {
      const stepId = `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      activeThinking = {
        id: stepId,
        type: 'thinking',
        label: 'Thinking...',
        reasoningText: '',
        status: 'active',
        timestamp: Date.now(),
      };
      this.steps.push(activeThinking);
      this.activeThinkingStepId = stepId;
      this.onEvent({ type: 'step_start', step: activeThinking });
    }

    activeThinking.reasoningText = (activeThinking.reasoningText ?? '') + text;
    this.onEvent({ type: 'reasoning_delta', stepId: activeThinking.id, delta: text });
  }

  onStartStep(): void {
    this.currentStepPreToolText = '';
  }

  onFinishStep(usage?: TokenUsage): void {
    this.closeActiveThinking(usage);
    const lastStep = this.steps[this.steps.length - 1];
    if (lastStep && usage && !lastStep.usage) {
      lastStep.usage = usage;
    }
  }

  onToolCall(part: { toolCallId: string; toolName: string; input: unknown }): void {
    const cleanedPreToolText = sanitizeAgentText(this.currentStepPreToolText, { removeIncomplete: true });

    if (cleanedPreToolText.length > 0) {
      const intermediateStep: AgentExecutionStep = {
        id: `step_text_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'intermediate_text',
        label: 'Model update',
        intermediateText: cleanedPreToolText,
        status: 'completed',
        timestamp: Date.now(),
        durationMs: 1000,
      };
      this.steps.push(intermediateStep);
      this.onEvent({ type: 'step_start', step: intermediateStep });
    }

    if (this.currentStepPreToolText.length > 0) {
      this.onEvent({ type: 'clear_text' });
      this.currentStepPreToolText = '';
    }

    this.closeActiveThinking();

    const toolStep: AgentExecutionStep = {
      id: `tool_${part.toolCallId}`,
      type: 'tool',
      toolName: part.toolName,
      label: part.toolName,
      status: 'active',
      timestamp: Date.now(),
      toolArgs: (part.input as Record<string, unknown>) ?? undefined,
    };
    this.steps.push(toolStep);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`   🛠️ [Tool Call]: ${part.toolName}`, part.input ?? {});
    }

    this.onEvent({ type: 'step_start', step: toolStep });
  }

  onToolResult(part: { toolCallId: string; toolName: string; input?: unknown; output: unknown }): void {
    this.resolveToolStep(part.toolCallId, part.toolName, part.input, part.output, false);
  }

  onToolError(part: { toolCallId: string; toolName: string; input?: unknown; error?: unknown }): void {
    const errorObj = part.error ?? 'Tool execution failed';
    const message = errorObj instanceof Error ? errorObj.message : String(errorObj);
    this.resolveToolStep(part.toolCallId, part.toolName, part.input, { success: false, error: message }, true);
  }

  private resolveToolStep(
    toolCallId: string,
    toolName: string,
    input: unknown,
    outputOrError: unknown,
    isError: boolean
  ): void {
    this.currentStepPreToolText = '';
    const step = this.steps.find((s) => s.id === `tool_${toolCallId}`);
    const toolArgs = (input as Record<string, unknown>) ?? step?.toolArgs ?? {};

    if (step) {
      step.status = isError ? 'error' : 'completed';
      step.durationMs = Math.max(1000, Date.now() - step.timestamp);
      step.toolResult = outputOrError;
      if (!step.toolArgs && input) step.toolArgs = toolArgs;

      this.onEvent({
        type: 'step_update',
        stepId: step.id,
        status: step.status,
        durationMs: step.durationMs,
        toolArgs: step.toolArgs,
        toolResult: step.toolResult,
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`   ${isError ? '❌ [Tool Error]' : '✔️ [Tool Result]'}: ${toolName}`);
    }

    this.executedToolCalls.push({
      toolName,
      args: toolArgs,
      result: outputOrError,
    });
  }

  onTextDelta(text: string): void {
    this.closeActiveThinking();
    this.currentStepPreToolText += text;
  }

  closeActiveThinking(usage?: TokenUsage): void {
    if (!this.activeThinkingStepId) return;
    const step = this.steps.find((s) => s.id === this.activeThinkingStepId);

    if (step && step.status === 'active') {
      if (!step.reasoningText?.trim()) {
        const idx = this.steps.indexOf(step);
        if (idx !== -1) this.steps.splice(idx, 1);
      } else {
        step.status = 'completed';
        step.durationMs = Math.max(1000, Date.now() - step.timestamp);
        if (usage) {
          step.usage = usage;
        }
        this.onEvent({
          type: 'step_update',
          stepId: step.id,
          status: 'completed',
          durationMs: step.durationMs,
          usage: step.usage,
        });
      }
    }
    this.activeThinkingStepId = null;
  }

  markActiveStepsFailed(reason = 'Execution error'): void {
    for (const step of this.steps) {
      if (step.status === 'active') {
        step.status = 'error';
        if (step.type === 'tool' && !step.toolResult) {
          step.toolResult = { success: false, error: reason };
        }
        this.onEvent({
          type: 'step_update',
          stepId: step.id,
          status: 'error',
          toolResult: step.toolResult,
        });
      }
    }
    this.activeThinkingStepId = null;
  }

  finalizeSteps(): AgentExecutionStep[] {
    for (const step of this.steps) {
      if (step.status === 'active') {
        step.durationMs = Math.max(1000, Date.now() - step.timestamp);
        const finalStatus: 'completed' | 'error' =
          step.type === 'thinking' || Boolean(step.toolResult) ? 'completed' : 'error';
        step.status = finalStatus;
        if (step.type === 'tool' && !step.toolResult) {
          step.toolResult = { success: false, error: 'Tool execution was interrupted or timed out' };
        }
        this.onEvent({
          type: 'step_update',
          stepId: step.id,
          status: finalStatus,
          durationMs: step.durationMs,
          toolArgs: step.toolArgs,
          toolResult: step.toolResult,
        });
      }
    }

    return this.steps.filter(
      (s) => s.type !== 'thinking' || Boolean(s.reasoningText?.trim())
    );
  }

  getExecutedToolCalls(): ExecutedToolCall[] {
    return this.executedToolCalls;
  }
}
