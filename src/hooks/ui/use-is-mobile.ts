'use client';

import { useSyncExternalStore } from 'react';

/**
 * Reusable reactive media query hook powered by `useSyncExternalStore`.
 * Safe for SSR hydration without flickering.
 */
export function useIsMobile(breakpointPx: number = 767): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === 'undefined') return () => {};
      const mql = window.matchMedia(`(max-width: ${breakpointPx}px)`);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    () => (typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${breakpointPx}px)`).matches : false),
    () => false
  );
}
