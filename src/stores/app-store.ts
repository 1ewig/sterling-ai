import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessageRecord } from '@/lib/db';
import { DEFAULT_CONVERSATION_ID } from '@/lib/db';

export interface AppState {
  activeConversationId: string;
  setActiveConversationId: (id: string) => void;
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  activeStreamMessage: ChatMessageRecord | null;
  setActiveStreamMessage: (
    messageOrUpdater:
      | ChatMessageRecord
      | null
      | ((prev: ChatMessageRecord | null) => ChatMessageRecord | null)
  ) => void;
  errorNotice: string | null;
  setErrorNotice: (error: string | null) => void;

  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;

  isMarketPanelOpen: boolean;
  setIsMarketPanelOpen: (open: boolean) => void;
  toggleMarketPanel: () => void;
  selectedMarketSymbol: string;
  setSelectedMarketSymbol: (symbol: string) => void;

  _hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeConversationId: DEFAULT_CONVERSATION_ID,
      setActiveConversationId: (id) => set({ activeConversationId: id }),
      input: '',
      setInput: (input) => set({ input }),
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      activeStreamMessage: null,
      setActiveStreamMessage: (messageOrUpdater) =>
        set((state) => ({
          activeStreamMessage:
            typeof messageOrUpdater === 'function'
              ? messageOrUpdater(state.activeStreamMessage)
              : messageOrUpdater,
        })),
      errorNotice: null,
      setErrorNotice: (errorNotice) => set({ errorNotice }),

      isSidebarCollapsed: false,
      setIsSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

      isMobileSidebarOpen: false,
      setIsMobileSidebarOpen: (isMobileSidebarOpen) => set({ isMobileSidebarOpen }),
      toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
      closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),

      isMarketPanelOpen: false,
      setIsMarketPanelOpen: (isMarketPanelOpen) => set({ isMarketPanelOpen }),
      toggleMarketPanel: () => set((state) => ({ isMarketPanelOpen: !state.isMarketPanelOpen })),
      selectedMarketSymbol: 'BTCUSDT',
      setSelectedMarketSymbol: (selectedMarketSymbol) => set({ selectedMarketSymbol }),

      _hasHydrated: false,
      setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),
    }),
    {
      name: 'sterling-session-store',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        activeConversationId: state.activeConversationId,
        isSidebarCollapsed: state.isSidebarCollapsed,
        isMarketPanelOpen: state.isMarketPanelOpen,
        selectedMarketSymbol: state.selectedMarketSymbol,
      }),
    }
  )
);
