'use client';

import React, { memo } from 'react';
import { AgentLoader } from '@/components/common';
import { ChatMessage } from './chat-message';
import type { ChatMessageRecord } from '@/lib/db';

export interface ChatMessageListProps {
  messages: ChatMessageRecord[];
  activeStreamMessage?: ChatMessageRecord | null;
  isLoading: boolean;
  errorNotice?: string | null;
  lastAssistantMessageId: string | null;
  isChatEmpty: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onSend: (text: string) => Promise<void> | void;
}

/**
 * Pure presentation list component rendering the chronological message history,
 * active streaming message, draft loader, and error banners.
 * Memoized to avoid re-rendering message trees when sibling panel states change.
 */
export const ChatMessageList = memo(function ChatMessageList({
  messages,
  activeStreamMessage,
  isLoading,
  errorNotice,
  lastAssistantMessageId,
  isChatEmpty,
  scrollContainerRef,
  messagesEndRef,
  onScroll,
  onSend,
}: ChatMessageListProps) {
  return (
    <div
      ref={scrollContainerRef}
      onScroll={onScroll}
      className={`relative z-10 flex-1 flex flex-col-reverse overflow-y-auto overscroll-y-contain [will-change:scroll-position] [transform:translateZ(0)] px-spacing-md sm:px-spacing-lg pt-spacing-md pb-spacing-lg min-h-0 custom-scrollbar ${
        isChatEmpty ? 'pointer-events-none select-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-spacing-md min-h-full justify-end">
        {messages.map((msg, index) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            animateEntrance={index === messages.length - 1 && isLoading}
            isLatestAssistantMessage={msg.id === lastAssistantMessageId}
            onSelectFollowUp={onSend}
          />
        ))}

        {/* Real-time Streaming Agent Response with Live Process Timeline */}
        {activeStreamMessage && (
          <ChatMessage
            key={activeStreamMessage.id}
            message={activeStreamMessage}
            isStreaming={true}
            animateEntrance={true}
          />
        )}

        {isLoading && !activeStreamMessage && (
          <div className="flex items-center gap-spacing-sm p-spacing-md bg-theme-bg-elevated rounded-xl border border-theme-border-subtle animate-pulse">
            <AgentLoader className="size-5 text-theme-brand-primary shrink-0" />
            <span className="text-sm text-theme-text-secondary font-medium">
              Searching the web & synthesizing response...
            </span>
          </div>
        )}

        {errorNotice && (
          <div className="p-spacing-sm px-spacing-md bg-theme-bg-elevated border border-theme-status-danger text-theme-status-danger rounded-xl text-xs">
            {errorNotice}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
});
