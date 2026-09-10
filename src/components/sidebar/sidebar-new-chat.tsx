'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { sidebarHorizontalCollapseVariants, tapScalePill } from '@/constants/animation';

interface SidebarNewChatProps {
  isCollapsed: boolean;
  onNewChat: () => void;
  disabled?: boolean;
}

export function SidebarNewChat({ isCollapsed, onNewChat, disabled = false }: SidebarNewChatProps) {
  return (
    <div className="py-spacing-sm px-3.5 border-b border-theme-border-subtle shrink-0 flex items-center justify-center">
      <motion.button
        type="button"
        whileTap={disabled ? undefined : tapScalePill}
        onClick={disabled ? undefined : onNewChat}
        disabled={disabled}
        title={disabled ? 'Current chat is already new' : 'New Chat'}
        aria-label="New Chat"
        className={`h-10 w-full rounded-xl font-bold text-xs flex items-center overflow-hidden select-none transition-colors ${
          disabled
            ? 'opacity-40 cursor-not-allowed bg-theme-brand-primary text-theme-bg-overlay shadow-none'
            : 'bg-theme-brand-primary text-theme-bg-overlay cursor-pointer shadow-2xs hover:brightness-105 active:brightness-95'
        }`}
      >
        {/* Anchored Icon Slot: exactly 40px wide to guarantee mathematical center */}
        <div className="size-10 flex items-center justify-center shrink-0">
          <Plus className="size-4 stroke-[2.75]" />
        </div>

        {/* Sliding text label */}
        <motion.span
          initial={false}
          variants={sidebarHorizontalCollapseVariants}
          animate={isCollapsed ? 'collapsed' : 'expanded'}
          className="whitespace-nowrap overflow-hidden text-left select-none pr-3"
        >
          New Chat
        </motion.span>
      </motion.button>
    </div>
  );
}
