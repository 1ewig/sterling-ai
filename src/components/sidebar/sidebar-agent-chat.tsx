'use client';

import React, { memo } from 'react';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const isActive = pathname === '/chat' || pathname === '/';

  return (
    <div className="pt-spacing-sm px-3.5 shrink-0 flex items-center justify-center">
      <motion.button
        type="button"
        whileTap={disabled ? undefined : tapScalePill}
        onClick={disabled ? undefined : onNewChat}
        disabled={disabled}
        title="Agent Chat"
        aria-label="Agent Chat"
        className={`group h-10 w-full rounded-xl text-xs flex items-center justify-center overflow-hidden select-none transition-colors px-2.5 ${
          disabled
            ? 'opacity-40 cursor-not-allowed bg-theme-bg-elevated text-theme-text-muted border border-theme-border-subtle shadow-none'
            : isActive
            ? 'bg-theme-brand-primary text-theme-bg-overlay font-bold cursor-pointer shadow-2xs hover:brightness-105 active:brightness-95 border border-transparent'
            : 'bg-theme-bg-elevated/40 hover:bg-theme-bg-elevated text-theme-text-secondary hover:text-theme-text-primary font-medium cursor-pointer border border-theme-border-subtle hover:border-theme-border-strong'
        }`}
      >
        <Bot
          className={`size-4 shrink-0 stroke-[2.25] transition-colors ${
            isActive
              ? 'text-theme-bg-overlay'
              : 'text-theme-text-muted group-hover:text-theme-text-primary'
          }`}
        />
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
