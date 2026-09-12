'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { sidebarHorizontalCollapseVariants, tapScalePill } from '@/constants/animation';

export interface SidebarAgentChatProps {
  isCollapsed: boolean;
  onNewChat: () => void;
  disabled?: boolean;
}

export type SidebarNewChatProps = SidebarAgentChatProps;

export const SidebarAgentChat = memo(function SidebarAgentChat({
  isCollapsed,
  onNewChat,
  disabled = false,
}: SidebarAgentChatProps) {
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
        <Bot className="size-4 shrink-0 stroke-[2.25]" />
        <motion.span
          initial={false}
          variants={sidebarHorizontalCollapseVariants}
          animate={isCollapsed ? 'collapsed' : 'expanded'}
          className="whitespace-nowrap overflow-hidden select-none truncate tracking-tight pl-1.5"
        >
          Agent Chat
        </motion.span>
      </motion.button>
    </div>
  );
});

export const SidebarNewChat = SidebarAgentChat;

