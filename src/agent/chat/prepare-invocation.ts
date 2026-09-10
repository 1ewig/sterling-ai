import { getAgentModel, getBackupAgentModel } from '../providers/models';
import { getAgentTools, type AgentTools } from '../tools';
import {
  ARGUS_INSTRUCTIONS,
  FIRST_TURN_SESSION_TITLE_DIRECTIVE,
} from '../instructions';
import type { AgentOptions } from '../types';

export interface PreparedAgentInvocation {
  model: ReturnType<typeof getAgentModel>;
  backupModel: ReturnType<typeof getBackupAgentModel>;
  tools: AgentTools;
  effectiveSystemPrompt: string;
  currentUserPrompt: string;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  reasoningEffort: 'high' | 'medium' | 'low' | 'max' | 'default' | 'none';
  maxTokens: number;
}

/**
 * Prepares the model, tools, prompt context, and directives for agent execution.
 */
export function prepareAgentInvocation(options: AgentOptions): PreparedAgentInvocation {
  const {
    prompt,
    provider,
    modelName,
    backupModelName,
    apiKey,
    history = [],
    isFirstTurn,
    systemDirective,
  } = options;

  const tools = getAgentTools();
  const model = getAgentModel(modelName, apiKey, provider);
  const backupModel = getBackupAgentModel(backupModelName, apiKey);

  const currentUserPrompt = prompt;

  const effectiveIsFirstTurn = isFirstTurn ?? (!history || history.length === 0);
  const directives: string[] = [];
  if (effectiveIsFirstTurn) {
    directives.push(FIRST_TURN_SESSION_TITLE_DIRECTIVE);
  }
  if (systemDirective) {
    directives.push(systemDirective);
  }

  const effectiveSystemPrompt = directives.length > 0
    ? `${ARGUS_INSTRUCTIONS}\n\n${directives.join('\n\n')}`
    : ARGUS_INSTRUCTIONS;

  const messages = history && history.length > 0
    ? [
        ...history.slice(-10).map((h) => ({
          role: h.role,
          content: h.content,
        })),
        {
          role: 'user' as const,
          content: currentUserPrompt,
        },
      ]
    : undefined;

  const reasoningEffort =
    (process.env.FIREWORKS_REASONING_EFFORT as 'high' | 'medium' | 'low' | 'max' | 'default' | 'none') ||
    (process.env.GROQ_REASONING_EFFORT as 'high' | 'medium' | 'low' | 'default' | 'none') ||
    'low';

  const envMaxTokens = Number(process.env.GROQ_MAX_TOKENS);
  const maxTokens =
    options.maxTokens ??
    (Number.isFinite(envMaxTokens) && envMaxTokens > 0 ? envMaxTokens : 6000);

  return {
    model,
    backupModel,
    tools,
    effectiveSystemPrompt,
    currentUserPrompt,
    messages,
    reasoningEffort,
    maxTokens,
  };
}
