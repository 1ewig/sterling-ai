import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TRADING_MODE_STORAGE_KEY } from '@/constants/storage';
import type { BitgetApiCredentials } from '@/lib/bitget/auth/signer';

export type TradingMode = 'sandbox' | 'live';

export type { BitgetApiCredentials };

export interface TradingModeState {
  mode: TradingMode;
  credentials: BitgetApiCredentials | null;
  isKeysModalOpen: boolean;

  // Actions
  setTradingMode: (mode: TradingMode) => void;
  setCredentials: (credentials: BitgetApiCredentials | null) => void;
  clearCredentials: () => void;
  openKeysModal: () => void;
  closeKeysModal: () => void;
  hasLiveCredentials: () => boolean;
}

export const useTradingModeStore = create<TradingModeState>()(
  persist(
    (set, get) => ({
      mode: 'sandbox',
      credentials: null,
      isKeysModalOpen: false,

      setTradingMode: (mode) => set({ mode }),
      setCredentials: (credentials) =>
        set({
          credentials,
          mode: credentials ? 'live' : 'sandbox',
        }),
      clearCredentials: () =>
        set({
          credentials: null,
          mode: 'sandbox',
        }),
      openKeysModal: () => set({ isKeysModalOpen: true }),
      closeKeysModal: () => set({ isKeysModalOpen: false }),
      hasLiveCredentials: () => {
        const c = get().credentials;
        return Boolean(c && c.apiKey && c.apiSecret && c.passphrase);
      },
    }),
    {
      name: TRADING_MODE_STORAGE_KEY,
      partialize: (state) => ({
        mode: state.mode,
        credentials: state.credentials,
      }),
    }
  )
);

/**
 * Synchronous, non-reactive access to the currently active trading mode.
 * Preferred inside event/callback bodies where the subscribed value would be stale.
 */
export function getTradingMode(): TradingMode {
  return useTradingModeStore.getState().mode;
}
