export type InferenceProviderType = 'groq' | 'fireworks';

/**
 * Default model identifiers for supported inference providers
 */
export const DEFAULT_GROQ_MODEL = 'qwen/qwen3.8-27b';
export const DEFAULT_GROQ_BACKUP_MODEL = 'openai/gpt-oss-120b';

export const DEFAULT_FIREWORKS_MODEL = 'accounts/fireworks/models/deepseek-v4p1-flash';
export const DEFAULT_FIREWORKS_BACKUP_MODEL = 'accounts/fireworks/models/glm-5p3-flash';


