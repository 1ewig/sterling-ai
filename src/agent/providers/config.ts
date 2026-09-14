export type InferenceProviderType = 'fireworks' | 'bitget';

/**
 * Default model identifiers and base URLs for supported inference providers (Fireworks AI & Bitget AI)
 */
export const DEFAULT_FIREWORKS_MODEL = 'accounts/fireworks/models/deepseek-v4p1-flash';
export const DEFAULT_FIREWORKS_BACKUP_MODEL = 'accounts/fireworks/models/glm-5p3-flash';

export const DEFAULT_BITGET_MODEL = 'qwen3.8-max';
export const DEFAULT_BITGET_BACKUP_MODEL = 'qwen3.8-max';
export const DEFAULT_BITGET_BASE_URL = 'https://hackathon.bitgetops.com/v1';
