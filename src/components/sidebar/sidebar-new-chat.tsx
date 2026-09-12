'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { tapScalePill } from '@/constants/animation';

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
        title={disabled ? 'Current chat is already new' : 'Agent Chat'}
        aria-label="Agent Chat"
        className={`h-10 w-full rounded-xl font-bold text-xs flex items-center justify-center overflow-hidden select-none transition-colors px-2.5 ${
          disabled
            ? 'opacity-40 cursor-not-allowed bg-theme-brand-primary text-theme-bg-overlay shadow-none'
            : 'bg-theme-brand-primary text-theme-bg-overlay cursor-pointer shadow-2xs hover:brightness-105 active:brightness-95'
        }`}
      >
        <span className="whitespace-nowrap overflow-hidden select-none truncate text-center tracking-tight">
          {isCollapsed ? 'AC' : 'Agent Chat'}
        </span>
      </motion.button>
    </div>
  );
}

