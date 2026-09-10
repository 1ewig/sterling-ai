'use client';

import React from 'react';
import { ChatInput } from './chat-input';

export interface ChatDockProps {
  isLoading: boolean;
  onSend: (text: string) => Promise<void> | void;
  onStop: () => void;
}

export function ChatDock({ isLoading, onSend, onStop }: ChatDockProps) {
  return (
    <div className="relative z-20 w-full bg-gradient-to-t from-theme-bg-base via-theme-bg-base/95 to-transparent pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:pb-spacing-xl px-spacing-md sm:px-spacing-lg shrink-0">
      <ChatInput
        isLoading={isLoading}
        onSend={onSend}
        onStop={onStop}
        containerClassName="w-full p-0 bg-transparent"
      />
    </div>
  );
}
