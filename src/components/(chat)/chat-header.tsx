'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Menu } from 'lucide-react';
import { tapScalePill } from '@/constants/animation';

export interface ChatHeaderProps {
  title?: string;
  isNewChatDisabled: boolean;
  isChatEmpty?: boolean;
  onToggleMobileSidebar?: () => void;
  onNewChat: () => void;
}

/**
 * Pure presentation header for the chat stage.
 */
export const ChatHeader = memo(function ChatHeader({
  title = 'New Chat',
  isNewChatDisabled,
  isChatEmpty = false,
  onToggleMobileSidebar,
  onNewChat,
}: ChatHeaderProps) {
  return (
    <div
      className={`relative z-30 h-14 px-spacing-md sm:px-spacing-lg flex items-center justify-between shrink-0 gap-3 transition-colors duration-300 ${
        isChatEmpty
          ? 'bg-transparent border-b border-transparent'
          : 'bg-theme-bg-base/40 backdrop-blur-xs border-b border-theme-border-subtle/50'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <motion.button
          type="button"
          whileTap={tapScalePill}
          onClick={onToggleMobileSidebar}
          title="Open navigation sidebar"
          aria-label="Open navigation sidebar"
          className="md:hidden size-8 -ml-1 rounded-lg flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-surface active:bg-theme-bg-elevated border border-transparent hover:border-theme-border-subtle transition-colors cursor-pointer select-none shrink-0"
        >
          <Menu className="size-5 stroke-[2]" />
        </motion.button>

        <AnimatePresence>
          {!isChatEmpty && (
            <motion.div
              key="chat-header-title"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5 overflow-hidden py-1 min-w-0"
            >
              <span
                className="text-xs sm:text-sm font-semibold tracking-tight text-theme-text-primary truncate"
                title={title}
              >
                {title}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {!isChatEmpty && (
          <motion.div
            key="chat-header-actions"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 shrink-0"
          >
            <motion.button
              type="button"
              whileTap={isNewChatDisabled ? undefined : tapScalePill}
              onClick={onNewChat}
              disabled={isNewChatDisabled}
              title={
                isNewChatDisabled
                  ? 'Current chat is already new'
                  : 'Start a new conversation'
              }
              aria-label="New Chat"
              className={`size-8 sm:h-8 sm:w-auto sm:px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 select-none transition-colors ${
                isNewChatDisabled
                  ? 'opacity-40 cursor-not-allowed bg-theme-brand-primary text-theme-bg-overlay'
                  : 'bg-theme-brand-primary text-theme-bg-overlay cursor-pointer shadow-2xs hover:brightness-105 active:brightness-95'
              }`}
            >
              <Plus className="size-4 sm:size-3.5 stroke-[2.75]" />
              <span className="hidden sm:inline font-bold">New Chat</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
