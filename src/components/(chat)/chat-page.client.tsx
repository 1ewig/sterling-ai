'use client';

import React, { useCallback } from 'react';
import { useChatSessions } from '@/hooks';
import { useAppStore } from '@/stores/app-store';
import { ChatHeader } from './chat-header';
import { ChatClient } from './chat-client';

/**
 * Main orchestrator for the chat page layout.
 */
export function ChatPageClient() {
  const toggleMobileSidebar = useAppStore((state) => state.toggleMobileSidebar);

  const { isNewChatDisabled, handleNewSession } = useChatSessions();

  const handleNewChat = useCallback(() => {
    handleNewSession();
  }, [handleNewSession]);

  return (
    <div className="relative flex flex-col h-full w-full bg-theme-bg-base overflow-hidden">
      <ChatHeader
        isNewChatDisabled={isNewChatDisabled}
        onToggleMobileSidebar={toggleMobileSidebar}
        onNewChat={handleNewChat}
      />

      <div className="relative flex-1 min-h-0 w-full flex flex-row overflow-hidden">
        <div className="relative flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
          <ChatClient />
        </div>
      </div>
    </div>
  );
}
