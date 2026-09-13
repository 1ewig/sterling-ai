import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StagedTradeItem {
  id: string;
  ticketToken: string;
  symbol: string;
  category: string;
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  size: number;
  price?: number;
  tradeSide?: string;
  leverage?: number;
  notionalUsdt?: number;
  initialMarginUsdt?: number;
  estimatedLiquidation?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  riskRewardRatio?: string;
  rationale?: string;
  createdAt: number;
  expiresAt: number;
  status: 'staged' | 'executing' | 'executed' | 'cancelled' | 'expired';
  orderId?: string;
  executionError?: string;
}

export interface StagedTradesState {
  stagedTrades: StagedTradeItem[];
  activePopupId: string | null;
  stageTrade: (
    trade: Omit<StagedTradeItem, 'createdAt' | 'expiresAt' | 'status'> & {
      createdAt?: number;
      expiresAt?: number;
    },
    autoOpenPopup?: boolean
  ) => void;
  openPopup: (id: string) => void;
  closePopup: () => void;
  discardTrade: (id: string) => void;
  updateTradeStatus: (id: string, update: Partial<StagedTradeItem>) => void;
  clearExpired: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useStagedTradesStore = create<StagedTradesState>()(
  persist(
    (set) => ({
      stagedTrades: [],
      activePopupId: null,
      _hasHydrated: false,
      setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),

      stageTrade: (tradeData, autoOpenPopup = true) =>
        set((state) => {
          const now = Date.now();
          // If already staged with same ticket ID, do not duplicate
          const existing = state.stagedTrades.find((t) => t.id === tradeData.id);
          if (existing) {
            return {
              activePopupId: autoOpenPopup ? tradeData.id : state.activePopupId,
            };
          }

          const newTrade: StagedTradeItem = {
            ...tradeData,
            createdAt: tradeData.createdAt ?? now,
            // Default 5-minute TTL matching HMAC ticket token
            expiresAt: tradeData.expiresAt ?? now + 5 * 60 * 1000,
            status: 'staged',
          };

          return {
            stagedTrades: [newTrade, ...state.stagedTrades],
            activePopupId: autoOpenPopup ? newTrade.id : state.activePopupId,
          };
        }),

      openPopup: (id) => set({ activePopupId: id }),

      closePopup: () => set({ activePopupId: null }),

      discardTrade: (id) =>
        set((state) => ({
          stagedTrades: state.stagedTrades.filter((t) => t.id !== id),
          activePopupId: state.activePopupId === id ? null : state.activePopupId,
        })),

      updateTradeStatus: (id, update) =>
        set((state) => ({
          stagedTrades: state.stagedTrades.map((t) =>
            t.id === id ? { ...t, ...update } : t
          ),
        })),

      clearExpired: () =>
        set((state) => {
          const now = Date.now();
          return {
            stagedTrades: state.stagedTrades.filter(
              (t) => t.status === 'executed' || t.expiresAt > now
            ),
            activePopupId:
              state.activePopupId &&
              state.stagedTrades.find(
                (t) => t.id === state.activePopupId && t.expiresAt <= now && t.status === 'staged'
              )
                ? null
                : state.activePopupId,
          };
        }),
    }),
    {
      name: 'sterling-staged-trades-store',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        state?.clearExpired();
      },
      partialize: (state) => ({
        stagedTrades: state.stagedTrades,
      }),
    }
  )
);
