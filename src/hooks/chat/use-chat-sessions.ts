'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore } from '@/stores/app-store';
import {
  ensureDefaultConversation,
  getConversation,
  getConversationMessageCount,
  listConversations,
  createConversation,
  deleteConversation,
  renameConversation,
  useConversations,
  useConversationMessageCount,
  clearMessagesCache,
  initConversationCache,
} from '@/lib/db';

let isSessionInitStarted = false;

/**
 * Custom hook managing flat session list, active conversation selection,
 * inline renaming, deletion, and persistence.
 */
export function useChatSessions() {
  const router = useRouter();
  const pathname = usePathname();

  const activeConversationId = useAppStore((state) => state.activeConversationId);
  const setActiveConversationId = useAppStore((state) => state.setActiveConversationId);
  const setInput = useAppStore((state) => state.setInput);
  const isStreamingActive = useAppStore((state) => state.activeStreamMessage !== null);
  const setActiveStreamMessage = useAppStore((state) => state.setActiveStreamMessage);
  const setErrorNotice = useAppStore((state) => state.setErrorNotice);
  const hasHydrated = useAppStore((state) => state._hasHydrated);

  const activeMessageCount = useConversationMessageCount(activeConversationId);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);

  // Initialize and validate persisted session ONCE on client mount after store hydration
  useEffect(() => {
    if (!hasHydrated) return;
    if (isSessionInitStarted) return;
    isSessionInitStarted = true;

    async function initSession() {
      const store = useAppStore.getState();
      const activeId = store.activeConversationId;

      if (activeId) {
        const activeConv = await getConversation(activeId);
        if (activeConv) return;
      }

      const allConvs = await listConversations();
      if (allConvs.length > 0) {
        setActiveConversationId(allConvs[0].id);
        return;
      }

      const defaultConv = await ensureDefaultConversation();
      setActiveConversationId(defaultConv.id);
    }

    void initSession();
  }, [hasHydrated, setActiveConversationId]);

  // Reactive subscription to all conversations
  const conversations = useConversations();

  // Flat list sorted by most recently updated
  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)),
    [conversations]
  );

  // Active session title & record
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId),
    [conversations, activeConversationId]
  );
  const currentTitle = activeConversation?.title ?? 'New Chat';

  const isNewChatDisabled = Boolean(
    activeMessageCount === 0 &&
    !isStreamingActive
  );

  // Click-outside listener for sessions overflow menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setEditingId(null);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleToggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
    setEditingId(null);
  }, []);

  // Create a brand new session thread
  const handleNewSession = useCallback(async () => {
    setErrorNotice(null);
    setIsMenuOpen(false);
    setEditingId(null);
    setActiveStreamMessage(null);
    setInput('');

    // Check if current active conversation is empty
    const currentActive = conversations.find((c) => c.id === activeConversationId);
    if (currentActive) {
      const activeCount = await getConversationMessageCount(currentActive.id);
      if (activeCount === 0 && !isStreamingActive) {
        if (pathname !== '/chat') {
          router.push('/chat');
        }
        return;
      }
    }

    // Check for an existing empty conversation
    const all = await listConversations();
    for (const conv of all) {
      const count = await getConversationMessageCount(conv.id);
      if (count === 0) {
        setActiveConversationId(conv.id);
        if (pathname !== '/chat') {
          router.push('/chat');
        }
        return;
      }
    }

    // Create a new conversation
    const newConv = await createConversation();
    initConversationCache(newConv.id);
    setActiveConversationId(newConv.id);
    if (pathname !== '/chat') {
      router.push('/chat');
    }
  }, [
    activeConversationId,
    conversations,
    isStreamingActive,
    setErrorNotice,
    setActiveStreamMessage,
    setActiveConversationId,
    setInput,
    pathname,
    router,
  ]);

  // Switch session
  const handleSelectSession = useCallback(
    (id: string) => {
      setActiveConversationId(id);
      setInput('');
      setIsMenuOpen(false);
      setEditingId(null);
      setActiveStreamMessage(null);
      if (pathname !== '/chat') {
        router.push('/chat');
      }
    },
    [setActiveConversationId, setInput, setActiveStreamMessage, pathname, router]
  );

  // Start renaming session
  const handleStartRename = useCallback((id: string, sessionTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(sessionTitle);
  }, []);

  // Save renamed session
  const handleSaveRename = useCallback(async (id: string, e?: React.FormEvent | React.MouseEvent) => {
    e?.stopPropagation();
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    await renameConversation(id, trimmed);
    setEditingId(null);
  }, [editTitle]);

  // Cancel renaming
  const handleCancelRename = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(null);
    setEditTitle('');
  }, []);

  // Delete session
  const handleDeleteSession = useCallback(
    async (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      await deleteConversation(id);
      clearMessagesCache(id);

      let freshConvs = await listConversations();

      if (activeConversationId === id) {
        setInput('');
        if (freshConvs.length > 0) {
          setActiveConversationId(freshConvs[0].id);
        } else {
          const newConv = await createConversation();
          setActiveConversationId(newConv.id);
        }
      }
    },
    [activeConversationId, setActiveConversationId, setInput]
  );

  return {
    activeConversationId,
    activeConversation,
    currentTitle,
    conversations: sortedConversations,
    isMenuOpen,
    setIsMenuOpen,
    editingId,
    setEditingId,
    editTitle,
    setEditTitle,
    menuRef,
    handleToggleMenu,
    handleNewSession,
    handleSelectSession,
    handleStartRename,
    handleSaveRename,
    handleCancelRename,
    handleDeleteSession,
    isNewChatDisabled,
    activeMessageCount,
  };
}
