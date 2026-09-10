'use client';

import React from 'react';
import { ChatInput } from './chat-input';

export interface ChatDockProps {
  isLoading: boolean;
  onSend: (text: string) => Promise<void> | void;
  onStop: () => void;
  className?: string;
}

export function ChatDock({
  isLoading,
  onSend,
  onStop,
  className = 'max-w-4xl',
}: ChatDockProps) {
  return (
    <div className="relative z-20 w-full bg-gradient-to-t from-theme-bg-base via-theme-bg-base/95 to-transparent pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] sm:pb-spacing-md px-spacing-md sm:px-spacing-lg shrink-0">
      <ChatInput
        isLoading={isLoading}
        onSend={onSend}
        onStop={onStop}
        className={className}
        containerClassName="w-full p-0 bg-transparent"
      />
    </div>
  );
}
