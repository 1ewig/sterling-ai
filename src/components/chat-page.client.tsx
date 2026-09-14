'use client';

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatSessions } from '@/hooks';
import { useAppStore } from '@/stores/app-store';
import { useMessages } from '@/lib/db';
import { ChatHeader, ChatClient } from '@/components/(chat)';
import { MarketStreamerPanel } from '@/components/(market-streamer)';

/**
 * Main orchestrator for the chat page layout.
 */
export function ChatPageClient() {
  const toggleMobileSidebar = useAppStore((state) => state.toggleMobileSidebar);
  const isLoading = useAppStore((state) => state.isLoading);
  const activeStreamMessage = useAppStore((state) => state.activeStreamMessage);
  const isMarketPanelOpen = useAppStore((state) => state.isMarketPanelOpen);
  const toggleMarketPanel = useAppStore((state) => state.toggleMarketPanel);

  const { isNewChatDisabled, handleNewSession, currentTitle, activeConversationId } = useChatSessions();
  const { messages, isMessagesLoading } = useMessages(activeConversationId);

  const isChatEmpty = !isMessagesLoading && messages.length === 0 && !activeStreamMessage;
  const isAgentActive = isLoading || !!activeStreamMessage;

  const handleNewChat = useCallback(() => {
    handleNewSession();
  }, [handleNewSession]);

  return (
    <div className="relative flex flex-col h-full w-full bg-theme-bg-base overflow-hidden">
      {/* Full-stage ambient breathing glow spanning across the entire page, active only in empty state */}
      <AnimatePresence>
        {isChatEmpty && (
          <motion.div
            key="chat-page-empty-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
          >
            <div className="absolute inset-0 chat-empty-background" />
            <div className="chat-empty-blob blob-1" />
            <div className="chat-empty-blob blob-2" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active inference dual-wall breathing glow on left & right viewport edges */}
      <AnimatePresence>
        {isAgentActive && (
          <motion.div
            key="chat-page-active-inference-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
          >
            <div className="absolute inset-y-0 left-0 w-48 sm:w-64 wall-glow-left animate-wall-breathe" />
            <div className="absolute inset-y-0 right-0 w-48 sm:w-64 wall-glow-right animate-wall-breathe" />
          </motion.div>
        )}
      </AnimatePresence>

      <ChatHeader
        title={currentTitle}
        isNewChatDisabled={isNewChatDisabled}
        isChatEmpty={isChatEmpty}
        isMarketPanelOpen={isMarketPanelOpen}
        onToggleMobileSidebar={toggleMobileSidebar}
        onToggleMarketPanel={toggleMarketPanel}
        onNewChat={handleNewChat}
      />

      <div className="relative z-10 flex-1 min-h-0 w-full flex flex-row overflow-hidden">
        <div className="relative flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
          <ChatClient />
        </div>
        <MarketStreamerPanel />
      </div>
    </div>
  );
}
