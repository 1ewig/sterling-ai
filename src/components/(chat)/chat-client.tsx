'use client';

import React, { useMemo, memo } from 'react';
import { useAgentChat } from '@/hooks';
import { ChatEmptyState, ChatDock, type QuickActionItem } from './input';
import { ChatMessageList } from './messages';

const DEFAULT_QUICK_ACTIONS: QuickActionItem[] = [
  { id: 'tsla-rtoken', label: 'TSLA Perception', template: 'Provide a complete multi-timeframe perception briefing on TSLAUSDT tokenized stock, including RSI/MACD indicators, orderbook depth, and macro risk regime.' },
  { id: 'btc-divergence', label: 'BTC Divergence', template: 'Analyze BTCUSDT with current funding rates, top trader long/short divergence, and derivatives squeeze risk.' },
  { id: 'cross-asset-macro', label: 'Macro Regime & Yields', template: 'Run a cross-asset macro correlation analysis across Fed funds rate, 10Y-2Y yield curve spread, and crypto liquidity.' },
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
