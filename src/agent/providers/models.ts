import { createFireworks } from '@ai-sdk/fireworks';
import { createOpenAI } from '@ai-sdk/openai';
import { wrapLanguageModel, extractReasoningMiddleware } from 'ai';
import {
  type InferenceProviderType,
  DEFAULT_FIREWORKS_MODEL,
  DEFAULT_FIREWORKS_BACKUP_MODEL,
  DEFAULT_BITGET_MODEL,
  DEFAULT_BITGET_BACKUP_MODEL,
  DEFAULT_BITGET_BASE_URL,
} from './config';

const ERR_MISSING_BITGET_KEY =
  'BITGET_AI_API_KEY environment variable is not configured. Please set your Bitget AI API key in .env.local.';
const ERR_MISSING_FIREWORKS_KEY =
  'FIREWORKS_API_KEY environment variable is not configured. Please set your Fireworks API key in .env.local.';

/**
 * Resolves the active inference provider from options or environment variables
 */
export function getActiveInferenceProvider(override?: InferenceProviderType): InferenceProviderType {
  if (override) return override;
  const envProvider = process.env.INFERENCE_PROVIDER?.toLowerCase();
  if (envProvider === 'bitget') return 'bitget';
  return 'fireworks';
}

/**
 * Wraps models with reasoning extraction middleware to capture thinking deltas
 */
export function wrapModelWithThinking<T extends Parameters<typeof wrapLanguageModel>[0]['model']>(model: T) {
  return wrapLanguageModel({
    model,
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  });
}

/**
 * Alias for Fireworks thinking wrapper for backward compatibility
 */
export const wrapFireworksWithThinking = wrapModelWithThinking;

/**
 * Returns a configured model instance (Bitget AI or Fireworks) for agent reasoning and tool dispatch
 */
export function getAgentModel(
  modelName?: string,
  apiKey?: string,
  providerOverride?: InferenceProviderType
) {
  const provider = getActiveInferenceProvider(providerOverride);

  if (provider === 'bitget') {
    const resolvedApiKey = apiKey ?? process.env.BITGET_AI_API_KEY;
    if (!resolvedApiKey) {
      throw new Error(ERR_MISSING_BITGET_KEY);
    }
    const baseURL = process.env.BITGET_AI_BASE_URL ?? DEFAULT_BITGET_BASE_URL;
    const bitget = createOpenAI({
      name: 'bitget',
      baseURL,
      apiKey: resolvedApiKey,
    });
    const selectedModel = modelName ?? process.env.BITGET_AI_MODEL ?? DEFAULT_BITGET_MODEL;
    return wrapModelWithThinking(bitget.chat(selectedModel));
  }

  // Default to Fireworks
  const resolvedApiKey = apiKey ?? process.env.FIREWORKS_API_KEY;
  if (!resolvedApiKey) {
    throw new Error(ERR_MISSING_FIREWORKS_KEY);
  }
  const fireworks = createFireworks({ apiKey: resolvedApiKey });
  const selectedModel = modelName ?? process.env.FIREWORKS_MODEL ?? DEFAULT_FIREWORKS_MODEL;
  return wrapModelWithThinking(fireworks(selectedModel));
}

/**
 * Returns the configured backup model instance for automatic failover across models or providers
 */
export function getBackupAgentModel(
  backupModelName?: string,
  apiKey?: string,
  backupProviderOverride?: InferenceProviderType
) {
  const primaryProvider = getActiveInferenceProvider();
  const configuredBackupProvider = process.env.BACKUP_INFERENCE_PROVIDER?.toLowerCase() as InferenceProviderType | undefined;

  let backupProvider: InferenceProviderType = backupProviderOverride ?? configuredBackupProvider ?? primaryProvider;

  // Cross-provider failover: if primary is fireworks and bitget key exists (or vice versa), enable automatic failover
  if (!configuredBackupProvider) {
    if (primaryProvider === 'fireworks' && process.env.BITGET_AI_API_KEY) {
      backupProvider = 'bitget';
    } else if (primaryProvider === 'bitget' && process.env.FIREWORKS_API_KEY) {
      backupProvider = 'fireworks';
    }
  }

  if (backupProvider === 'bitget') {
    const resolvedApiKey = apiKey ?? process.env.BITGET_AI_API_KEY;
    if (!resolvedApiKey) {
      throw new Error(ERR_MISSING_BITGET_KEY);
    }
    const baseURL = process.env.BITGET_AI_BASE_URL ?? DEFAULT_BITGET_BASE_URL;
    const bitget = createOpenAI({
      name: 'bitget',
      baseURL,
      apiKey: resolvedApiKey,
    });
    const selectedModel = backupModelName ?? process.env.BITGET_AI_BACKUP_MODEL ?? DEFAULT_BITGET_BACKUP_MODEL;
    return wrapModelWithThinking(bitget.chat(selectedModel));
  }

  // Fireworks backup
  const resolvedApiKey = apiKey ?? process.env.FIREWORKS_API_KEY;
  if (!resolvedApiKey) {
    throw new Error(ERR_MISSING_FIREWORKS_KEY);
  }
  const fireworks = createFireworks({ apiKey: resolvedApiKey });
  const selectedModel = backupModelName ?? process.env.FIREWORKS_BACKUP_MODEL ?? DEFAULT_FIREWORKS_BACKUP_MODEL;
  return wrapModelWithThinking(fireworks(selectedModel));
}
