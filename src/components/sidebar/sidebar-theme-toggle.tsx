'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { sidebarHorizontalCollapseVariants, tapScalePill } from '@/constants/animation';

export interface SidebarThemeToggleProps {
  isCollapsed: boolean;
  isDark: boolean;
  onToggle: () => void;
}

/**
 * Pure presentation button to toggle color mode theme between light and dark.
 * Driven exclusively by props from LeftSidebar.
 */
export const SidebarThemeToggle = memo(function SidebarThemeToggle({
  isCollapsed,
  isDark,
  onToggle,
}: SidebarThemeToggleProps) {
  return (
    <div className="pt-1 pb-spacing-sm px-3.5 flex flex-col bg-theme-bg-base shrink-0 items-center">
      <motion.button
        type="button"
        whileTap={tapScalePill}
        onClick={onToggle}
        title={isDark ? 'Light Mode' : 'Dark Mode'}
        aria-label={isDark ? 'Light Mode' : 'Dark Mode'}
        className="h-10 w-full flex items-center rounded-xl bg-theme-bg-elevated hover:bg-theme-bg-surface active:bg-theme-bg-elevated border border-theme-border-subtle hover:border-theme-border-strong text-theme-text-secondary hover:text-theme-text-primary text-xs font-semibold cursor-pointer transition-colors shadow-2xs overflow-hidden"
      >
        {/* Anchored Theme Icon Slot */}
        <div className="size-10 flex items-center justify-center shrink-0">
          {isDark ? (
            <Sun className="size-4 text-theme-brand-primary" />
          ) : (
            <Moon className="size-4 text-theme-text-primary" />
          )}
        </div>

        {/* Label and Badge Container */}
        <motion.div
          initial={false}
          variants={sidebarHorizontalCollapseVariants}
          animate={isCollapsed ? 'collapsed' : 'expanded'}
          className="flex-1 flex items-center justify-between min-w-0 overflow-hidden whitespace-nowrap pr-2.5"
        >
          <span className="text-left font-medium">
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </span>

          <kbd className="text-2xs px-1.5 py-0.5 rounded bg-theme-bg-surface border border-theme-border-subtle text-theme-text-muted font-mono font-bold tracking-wider">
            {isDark ? 'LIGHT' : 'DARK'}
          </kbd>
        </motion.div>
      </motion.button>
    </div>
  );
});
