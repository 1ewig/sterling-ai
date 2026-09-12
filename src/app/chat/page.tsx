import React from 'react';
import { ChatPageClient } from '@/components/chat-page.client';

export default function ChatPage() {
  return (
    <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden bg-theme-bg-base">
      <ChatPageClient />
    </main>
  );
}
