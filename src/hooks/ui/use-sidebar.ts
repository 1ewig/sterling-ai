'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';

const SIDEBAR_STORAGE_KEY = 'sterling-sidebar-collapsed';

function getSidebarSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === SIDEBAR_STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Custom hook managing sidebar collapsed state via useSyncExternalStore
 * and mobile drawer state via Zustand app-store.
 * Synchronously reads persisted state from localStorage on first render to eliminate
 * any expanded->collapsed flash on page reload, while broadcasting updates across tabs.
 */
export function useSidebar() {
  const isSidebarCollapsed = useSyncExternalStore(
    subscribe,
    getSidebarSnapshot,
    getServerSnapshot
  );

  const isMobileSidebarOpen = useAppStore((state) => state.isMobileSidebarOpen);
  const setIsMobileSidebarOpen = useAppStore((state) => state.setIsMobileSidebarOpen);
  const toggleMobileSidebar = useAppStore((state) => state.toggleMobileSidebar);
  const closeMobileSidebar = useAppStore((state) => state.closeMobileSidebar);

  const setIsSidebarCollapsed = useCallback((collapsed: boolean) => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
      if (typeof document !== 'undefined') {
        if (collapsed) {
          document.documentElement.classList.add('sidebar-collapsed');
        } else {
          document.documentElement.classList.remove('sidebar-collapsed');
        }
      }
    } catch {
      // Ignore storage errors in private browsing/quota limits
    }
    notifyListeners();
  }, []);

  const toggleSidebar = useCallback(() => {
    const current = getSidebarSnapshot();
    setIsSidebarCollapsed(!current);
  }, [setIsSidebarCollapsed]);

  return {
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    toggleSidebar,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    toggleMobileSidebar,
    closeMobileSidebar,
  };
}
