/**
 * Canonical LocalStorage and Session storage keys for Sterling AI.
 */
export const STORAGE_KEYS = {
  THEME: 'sterling-theme',
  SIDEBAR_COLLAPSED: 'sterling-sidebar-collapsed',
  SESSION_STORE: 'sterling-session-store',
} as const;

export const THEME_STORAGE_KEY = STORAGE_KEYS.THEME;
export const SIDEBAR_STORAGE_KEY = STORAGE_KEYS.SIDEBAR_COLLAPSED;
export const SESSION_STORAGE_KEY = STORAGE_KEYS.SESSION_STORE;
