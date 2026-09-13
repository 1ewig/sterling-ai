import { create } from 'zustand';
import type { StagedActionRecord, StagedActionType, StagedActionStatus } from '@/lib/db';

export type { StagedActionRecord, StagedActionType, StagedActionStatus };

// Backward compatibility alias for UI components
export type StagedTradeItem = StagedActionRecord;
export type StagedActionItem = StagedActionRecord;

export interface StagedTradesUiState {
  activePopupId: string | null;
  openPopup: (id: string) => void;
  closePopup: () => void;
  setActivePopupId: (id: string | null) => void;
}

/**
 * Lightweight transient UI store for managing active modal popup focus.
 * Data persistence and lifecycle are managed by Dexie IndexedDB.
 */
export const useStagedTradesStore = create<StagedTradesUiState>((set) => ({
  activePopupId: null,
  openPopup: (id: string) => set({ activePopupId: id }),
  closePopup: () => set({ activePopupId: null }),
  setActivePopupId: (id: string | null) => set({ activePopupId: id }),
}));

