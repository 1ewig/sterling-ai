'use client';

import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { ArgusIcon } from '@/components/common';
import { sidebarHorizontalCollapseVariants, sidebarSpringTransition, tapScalePill } from '@/constants/animation';

export interface SidebarHeaderProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

/**
 * Pure presentation header for LeftSidebar.
 * Renders logo, brand title, and sidebar collapse/expand controls.
 */
export const SidebarHeader = memo(function SidebarHeader({ isCollapsed, onToggle }: SidebarHeaderProps) {
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  return (
    <div className="h-14 px-3.5 flex items-center border-b border-theme-border-subtle shrink-0 overflow-hidden">
      <div className="flex items-center w-full min-w-0">
        {/* Logo / Collapsed Expand Trigger */}
        <motion.button
          type="button"
          whileTap={tapScalePill}
          onMouseEnter={() => setIsLogoHovered(true)}
          onMouseLeave={() => setIsLogoHovered(false)}
          onClick={onToggle}
          className={`size-10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-colors select-none ${isCollapsed
              ? 'hover:bg-theme-bg-elevated active:bg-theme-bg-elevated/80 text-theme-brand-primary border border-transparent hover:border-theme-border-subtle'
              : 'hover:bg-theme-bg-elevated/60 active:bg-theme-bg-elevated text-theme-brand-primary border border-transparent hover:border-theme-border-subtle'
          }`}
          title={isCollapsed ? 'Expand sidebar' : 'Argus'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Argus'}
        >
          {isCollapsed && isLogoHovered ? (
            <PanelLeftOpen className="size-5 text-theme-brand-primary animate-in fade-in duration-150" />
          ) : (
            <ArgusIcon className="size-6 text-theme-brand-primary" />
          )}
        </motion.button>

        {/* Brand Title (Collapses horizontally with zero layout jump) */}
        <motion.div
          initial={false}
          variants={sidebarHorizontalCollapseVariants}
          animate={isCollapsed ? 'collapsed' : 'expanded'}
          className="flex flex-col min-w-0 overflow-hidden whitespace-nowrap flex-1 pl-2.5"
        >
          <span className="text-sm font-extrabold tracking-tight text-theme-text-primary leading-none">
            Argus
          </span>
          <span className="text-2xs font-semibold text-theme-text-muted leading-tight mt-0.5">
            AI Agent Starter Kit
          </span>
        </motion.div>

        {/* Collapse Toggle Button (Fades out when collapsed to prevent squeezing) */}
        <motion.div
          initial={false}
          animate={{
            opacity: isCollapsed ? 0 : 1,
            width: isCollapsed ? 0 : 'auto',
            scale: isCollapsed ? 0.8 : 1,
          }}
          transition={sidebarSpringTransition}
          className="overflow-hidden shrink-0 flex items-center"
        >
          <motion.button
            type="button"
            whileTap={tapScalePill}
            onClick={onToggle}
            className="size-8 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-bg-elevated active:bg-theme-bg-elevated/80 cursor-pointer transition-colors select-none"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            tabIndex={isCollapsed ? -1 : 0}
          >
            <PanelLeftClose className="size-4" />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
});
