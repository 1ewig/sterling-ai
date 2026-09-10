'use client';

import { useState, useCallback } from 'react';

/**
 * Manages accordion open/closed state with user overrides taking precedence over default/dynamic states.
 */
export function useAccordionOpenState(defaultOpen: boolean = false): {
  isOpen: boolean;
  toggleOpen: () => void;
  setIsOpen: (open: boolean) => void;
  resetUserToggle: () => void;
} {
  const [userToggled, setUserToggled] = useState<boolean | null>(null);
  const isOpen = userToggled !== null ? userToggled : defaultOpen;

  const toggleOpen = useCallback(() => {
    setUserToggled((prev) => (prev !== null ? !prev : !defaultOpen));
  }, [defaultOpen]);

  const setIsOpen = useCallback((open: boolean) => {
    setUserToggled(open);
  }, []);

  const resetUserToggle = useCallback(() => {
    setUserToggled(null);
  }, []);

  return {
    isOpen,
    toggleOpen,
    setIsOpen,
    resetUserToggle,
  };
}
