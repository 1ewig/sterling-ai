'use client';

import React, { useMemo, memo } from 'react';
import { useAgentChat } from '@/hooks';
import { ChatEmptyState, ChatDock, type QuickActionItem } from './input';
import { ChatMessageList } from './messages';

const DEFAULT_QUICK_ACTIONS: QuickActionItem[] = [
  { id: 'ai-trends', label: 'Latest AI News', template: 'What are the most significant developments in AI this week?' },
  { id: 'tech-research', label: 'Agent Architecture', template: 'Provide a comprehensive breakdown of modern AI agent architectures and tool calling' },
  { id: 'web-search', label: 'Live Web Search', template: 'Search and summarize the latest updates on quantum computing breakthroughs' },
];

/**
 * Dedicated Chat Stage Client Orchestrator
 */
export const ChatClient = memo(function ChatClient() {
  const {
    messages,
    isMessagesLoading,
    activeStreamMessage,
    isLoading,
    errorNotice,
    messagesEndRef,
    scrollContainerRef,
    handleScroll,
    handleSend,
    handleStop,
  } = useAgentChat();

  const isChatEmpty = !isMessagesLoading && messages.length === 0 && !activeStreamMessage;

  const lastAssistantMessageId = useMemo(() => {
    if (activeStreamMessage) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].status === 'success') {
        return messages[i].id;
      }
    }
    return null;
  }, [messages, activeStreamMessage]);

  return (
    <div className="relative flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 ambient-glow-gemini transition-opacity duration-500 ease-out ${
          isChatEmpty ? 'opacity-90' : 'opacity-30'
        }`}
      />

      {isChatEmpty && (
        <ChatEmptyState
          isLoading={isLoading}
          onSend={handleSend}
          onStop={handleStop}
          quickActions={DEFAULT_QUICK_ACTIONS}
        />
      )}

      <ChatMessageList
        messages={messages}
        activeStreamMessage={activeStreamMessage}
        isLoading={isLoading}
        errorNotice={errorNotice}
        lastAssistantMessageId={lastAssistantMessageId}
        isChatEmpty={isChatEmpty}
        scrollContainerRef={scrollContainerRef}
        messagesEndRef={messagesEndRef}
        onScroll={handleScroll}
        onSend={handleSend}
      />

      {!isChatEmpty && (
        <ChatDock
          isLoading={isLoading}
          onSend={handleSend}
          onStop={handleStop}
        />
      )}
    </div>
  );
});
