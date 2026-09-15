'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import { tapScalePill } from '@/constants/animation';
import { useAppStore } from '@/stores/app-store';

export interface MobileTopBarProps {
  title?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Clean mobile-only header bar with a hamburger drawer toggle button.
 * Hidden on desktop viewports (md:hidden).
 */
export const MobileTopBar = memo(function MobileTopBar({
  title,
  className = '',
  children,
}: MobileTopBarProps) {
  const toggleMobileSidebar = useAppStore((state) => state.toggleMobileSidebar);

  return (
    <header
      className={`md:hidden flex items-center justify-between h-14 px-4 bg-theme-bg-base/80 backdrop-blur-xs border-b border-theme-border-subtle/50 shrink-0 sticky top-0 z-20 transition-colors ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <motion.button
          type="button"
          whileTap={tapScalePill}
          onClick={toggleMobileSidebar}
          title="Open navigation sidebar"
          aria-label="Open navigation sidebar"
          className="size-8 -ml-1 rounded-lg flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-surface active:bg-theme-bg-elevated border border-transparent hover:border-theme-border-subtle transition-colors cursor-pointer select-none shrink-0"
        >
          <Menu className="size-5 stroke-[2]" />
        </motion.button>
        {title && (
          <span className="text-xs sm:text-sm font-semibold tracking-tight text-theme-text-primary truncate">
            {title}
          </span>
        )}
      </div>

      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </header>
  );
});
