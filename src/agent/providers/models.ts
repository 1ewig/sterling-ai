import { createGroq } from '@ai-sdk/groq';
import { createFireworks } from '@ai-sdk/fireworks';
import { wrapLanguageModel, extractReasoningMiddleware } from 'ai';
import {
  type InferenceProviderType,
  DEFAULT_GROQ_MODEL,
  DEFAULT_GROQ_BACKUP_MODEL,
  DEFAULT_FIREWORKS_MODEL,
  DEFAULT_FIREWORKS_BACKUP_MODEL,
} from './config';

/**
 * Resolves the active inference provider from options or environment variables
 */
export function getActiveInferenceProvider(override?: InferenceProviderType): InferenceProviderType {
  if (override) return override;
  const envProvider = process.env.INFERENCE_PROVIDER?.toLowerCase();
  if (envProvider === 'fireworks') return 'fireworks';
  return 'groq';
}

/**
 * Wraps Fireworks models with reasoning extraction middleware to capture thinking deltas
 */
export function wrapFireworksWithThinking(model: ReturnType<ReturnType<typeof createFireworks>>) {
  return wrapLanguageModel({
    model,
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  });
}

/**
 * Returns a configured model instance (Groq or Fireworks) for agent reasoning and tool dispatch
 */
export function getAgentModel(
  modelName?: string,
  apiKey?: string,
  providerOverride?: InferenceProviderType
) {
  const provider = getActiveInferenceProvider(providerOverride);

  if (provider === 'fireworks') {
    const resolvedApiKey = apiKey ?? process.env.FIREWORKS_API_KEY;
    if (!resolvedApiKey) {
      throw new Error('FIREWORKS_API_KEY environment variable is not configured. Please set your Fireworks API key in .env.local.');
    }
    const fireworks = createFireworks({ apiKey: resolvedApiKey });
    const selectedModel = modelName ?? process.env.FIREWORKS_MODEL ?? DEFAULT_FIREWORKS_MODEL;
    return wrapFireworksWithThinking(fireworks(selectedModel));
  }

  // Default to Groq
  const resolvedApiKey = apiKey ?? process.env.GROQ_API_KEY;
  if (!resolvedApiKey) {
    throw new Error('GROQ_API_KEY environment variable is not configured. Please set your Groq API key in .env.local.');
  }
  const groq = createGroq({ apiKey: resolvedApiKey });
  const selectedModel = modelName ?? process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL;
  return groq(selectedModel);
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

  // If no explicit backup provider is set, but primary is groq and a fireworks key is present, enable cross-provider failover
  if (!configuredBackupProvider && primaryProvider === 'groq' && process.env.FIREWORKS_API_KEY) {
    backupProvider = 'fireworks';
  }

  if (backupProvider === 'fireworks') {
    const resolvedApiKey = apiKey ?? process.env.FIREWORKS_API_KEY;
    if (!resolvedApiKey) {
      throw new Error('FIREWORKS_API_KEY environment variable is not configured. Please set your Fireworks API key in .env.local.');
    }
    const fireworks = createFireworks({ apiKey: resolvedApiKey });
    const selectedModel = backupModelName ?? process.env.FIREWORKS_BACKUP_MODEL ?? DEFAULT_FIREWORKS_BACKUP_MODEL;
    return wrapFireworksWithThinking(fireworks(selectedModel));
  }

  // Groq backup
  const resolvedApiKey = apiKey ?? process.env.GROQ_API_KEY;
  if (!resolvedApiKey) {
    throw new Error('GROQ_API_KEY environment variable is not configured. Please set your Groq API key in .env.local.');
  }
  const groq = createGroq({ apiKey: resolvedApiKey });
  const selectedModel = backupModelName ?? process.env.GROQ_BACKUP_MODEL ?? DEFAULT_GROQ_BACKUP_MODEL;
  return groq(selectedModel);
}
