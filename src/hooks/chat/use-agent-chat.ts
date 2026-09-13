'use client';

import { useCallback, useRef, useEffect } from 'react';
import { generateMessageId, getNowTimestamp } from '@/lib/utils';
import { useAppStore } from '@/stores/app-store';
import { stageFromToolResult } from './use-staged-actions';
import {
  getConversation,
  renameConversation,
  saveStoredMessage,
  updateCachedMessage,
  useMessages,
  type ChatMessageRecord,
} from '@/lib/db';
import { prepareConversationHistory, streamAgentChat } from '@/lib/chat';
import {
  sanitizeAgentText,
  stripIntermediateTextPrefix,
  isDefaultSessionTitle,
  generateFallbackSessionTitle,
} from '@/agent/transforms';
import type { AgentResult, AgentExecutionStep } from '@/agent/types';
import { useChatSessions } from './use-chat-sessions';
import { useChatScroll } from './use-chat-scroll';

const DEFAULT_ERROR_NOTICE =
  'Something went wrong while processing your request. Please check your AI provider configuration and connection.';

/**
 * Custom hook orchestrating agent chat interaction, Dexie message persistence,
 * and real-time SSE streaming.
 */
export function useAgentChat() {
  const isLoading = useAppStore((state) => state.isLoading);
  const setIsLoading = useAppStore((state) => state.setIsLoading);
  const activeStreamMessage = useAppStore((state) => state.activeStreamMessage);
  const setActiveStreamMessage = useAppStore((state) => state.setActiveStreamMessage);
  const errorNotice = useAppStore((state) => state.errorNotice);
  const setErrorNotice = useAppStore((state) => state.setErrorNotice);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const sessions = useChatSessions();
  const { activeConversationId } = sessions;

  const { messages, isMessagesLoading } = useMessages(activeConversationId);

  const messagesCount = messages.length;
  const streamStepCount = activeStreamMessage?.steps?.length ?? 0;
  const streamContentLength = activeStreamMessage?.content?.length ?? 0;

  const scroll = useChatScroll({
    activeConversationId,
    messagesCount,
    streamStepCount,
    streamContentLength,
    isLoading,
  });

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setActiveStreamMessage(null);
  }, [setIsLoading, setActiveStreamMessage]);

  const handleSend = useCallback(async (textToSend?: string) => {
    const prompt = (textToSend ?? '').trim();
    if (!prompt || isLoading) return;

    setErrorNotice(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMessage: ChatMessageRecord = {
      id: generateMessageId('usr'),
      conversationId: activeConversationId,
      role: 'user',
      content: prompt,
      status: 'success',
      timestamp: getNowTimestamp(),
    };

    updateCachedMessage(userMessage);
    await saveStoredMessage(userMessage);

    scroll.scrollToBottom(true);

    const streamMessageId = generateMessageId('agt');
    const initialStreamRecord: ChatMessageRecord = {
      id: streamMessageId,
      conversationId: activeConversationId,
      role: 'assistant',
      content: '',
      status: 'pending',
      steps: [],
      timestamp: getNowTimestamp(),
    };

    setActiveStreamMessage(initialStreamRecord);
    setIsLoading(true);

    let currentSteps: AgentExecutionStep[] = [];
    let currentText = '';
    let updateRafId: number | null = null;
    let needsContentUpdate = false;
    let needsStepsUpdate = false;

    const scheduleThrottledUpdate = () => {
      if (updateRafId !== null) return;
      updateRafId = requestAnimationFrame(() => {
        updateRafId = null;
        const displayContent = needsContentUpdate
          ? sanitizeAgentText(currentText, { removeIncomplete: true })
          : undefined;
        const nextSteps = needsStepsUpdate ? [...currentSteps] : undefined;

        setActiveStreamMessage((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ...(nextSteps !== undefined ? { steps: nextSteps } : {}),
            ...(displayContent !== undefined ? { content: displayContent } : {}),
          };
        });
        needsContentUpdate = false;
        needsStepsUpdate = false;
      });
    };

    const flushStreamUpdatesImmediate = () => {
      if (updateRafId !== null) {
        cancelAnimationFrame(updateRafId);
        updateRafId = null;
      }
      const displayContent = sanitizeAgentText(currentText, { removeIncomplete: true });
      setActiveStreamMessage((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          steps: [...currentSteps],
          content: displayContent,
        };
      });
      needsContentUpdate = false;
      needsStepsUpdate = false;
    };

    const conversationHistory = prepareConversationHistory(messages);
    const isFirstTurn = conversationHistory.length === 0;

    try {
      const finalResult: AgentResult | null = await streamAgentChat({
        message: prompt,
        history: conversationHistory,
        isFirstTurn,
        signal: controller.signal,
        onEvent: async (event) => {
          if (event.type === 'step_start') {
            currentSteps = [...currentSteps, event.step];
            flushStreamUpdatesImmediate();
          } else if (event.type === 'step_update') {
            currentSteps = currentSteps.map((s) =>
              s.id === event.stepId
                ? {
                    ...s,
                    ...(event.status ? { status: event.status } : {}),
                    ...(event.durationMs !== undefined ? { durationMs: event.durationMs } : {}),
                    ...(event.label ? { label: event.label } : {}),
                    ...(event.reasoningText !== undefined ? { reasoningText: event.reasoningText } : {}),
                    ...(event.toolArgs !== undefined ? { toolArgs: event.toolArgs } : {}),
                    ...(event.toolResult !== undefined ? { toolResult: event.toolResult } : {}),
                    ...(event.usage !== undefined ? { usage: event.usage } : {}),
                  }
                : s
            );
            flushStreamUpdatesImmediate();
          } else if (event.type === 'reasoning_delta') {
            currentSteps = currentSteps.map((s) =>
              s.id === event.stepId
                ? { ...s, reasoningText: (s.reasoningText ?? '') + event.delta }
                : s
            );
            needsStepsUpdate = true;
            scheduleThrottledUpdate();
          } else if (event.type === 'text_delta') {
            currentText += event.delta;
            needsContentUpdate = true;
            scheduleThrottledUpdate();
          } else if (event.type === 'clear_text') {
            currentText = '';
            flushStreamUpdatesImmediate();
          } else if (event.type === 'session_title') {
            const convRecord = await getConversation(activeConversationId);
            if (isDefaultSessionTitle(convRecord?.title)) {
              await renameConversation(activeConversationId, event.title);
            }
          } else if (event.type === 'error') {
            if (updateRafId !== null) {
              cancelAnimationFrame(updateRafId);
              updateRafId = null;
            }
            throw new Error(event.message);
          }
        },
      });

      if (updateRafId !== null) {
        cancelAnimationFrame(updateRafId);
        updateRafId = null;
      }

      const finalSteps = finalResult?.steps ?? currentSteps;
      const rawContent = finalResult?.analysis ?? sanitizeAgentText(currentText);
      const cleanContent = stripIntermediateTextPrefix(rawContent, finalSteps);

      const finalMessage: ChatMessageRecord = {
        id: streamMessageId,
        conversationId: activeConversationId,
        role: 'assistant',
        content: cleanContent,
        status: 'success',
        followUpQuestions: finalResult?.followUpQuestions,
        toolCalls: finalResult?.toolCalls,
        steps: finalSteps,
        stepCount: finalResult?.stepCount ?? currentSteps.length,
        workedDurationMs: finalResult?.workedDurationMs,
        timestamp: finalResult?.timestamp ?? getNowTimestamp(),
      };

      updateCachedMessage(finalMessage);
      await saveStoredMessage(finalMessage);

      // Auto-stage any staged trade orders, cancellations, or position exits generated during inference
      for (const step of finalSteps) {
        if (step.toolName && step.toolResult) {
          stageFromToolResult(step.toolName, step.toolResult, true);
        }
      }

      const resolvedTitle =
        finalResult?.sessionTitle ||
        (isFirstTurn ? generateFallbackSessionTitle(prompt) : undefined);

      if (resolvedTitle) {
        const convRecord = await getConversation(activeConversationId);
        if (isDefaultSessionTitle(convRecord?.title)) {
          await renameConversation(activeConversationId, resolvedTitle);
        }
      }
    } catch (err: unknown) {
      const isAborted =
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError');

      if (isAborted) {
        if (currentText.trim() || currentSteps.length > 0) {
          const stoppedMessage: ChatMessageRecord = {
            id: streamMessageId,
            conversationId: activeConversationId,
            role: 'assistant',
            content: stripIntermediateTextPrefix(sanitizeAgentText(currentText), currentSteps),
            status: 'success',
            steps: currentSteps,
            stepCount: currentSteps.length,
            timestamp: getNowTimestamp(),
          };
          updateCachedMessage(stoppedMessage);
          await saveStoredMessage(stoppedMessage);
        }

        if (isFirstTurn) {
          const convRecord = await getConversation(activeConversationId);
          if (isDefaultSessionTitle(convRecord?.title)) {
            await renameConversation(
              activeConversationId,
              generateFallbackSessionTitle(prompt)
            );
          }
        }
        return;
      }

      const msg = err instanceof Error ? err.message : DEFAULT_ERROR_NOTICE;
      setErrorNotice(msg);

      const errorRecord: ChatMessageRecord = {
        id: generateMessageId('err'),
        conversationId: activeConversationId,
        role: 'assistant',
        content: msg,
        status: 'error',
        timestamp: getNowTimestamp(),
      };
      updateCachedMessage(errorRecord);
      await saveStoredMessage(errorRecord);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setActiveStreamMessage(null);
      setIsLoading(false);
    }
  }, [
    isLoading,
    activeConversationId,
    messages,
    scroll,
    setActiveStreamMessage,
    setIsLoading,
    setErrorNotice,
  ]);

  return {
    activeConversationId: sessions.activeConversationId,
    currentTitle: sessions.currentTitle,
    conversations: sessions.conversations,
    messages,
    isMessagesLoading,
    activeStreamMessage,
    isLoading,
    errorNotice,
    isMenuOpen: sessions.isMenuOpen,
    setIsMenuOpen: sessions.setIsMenuOpen,
    editingId: sessions.editingId,
    setEditingId: sessions.setEditingId,
    editTitle: sessions.editTitle,
    setEditTitle: sessions.setEditTitle,
    messagesEndRef: scroll.messagesEndRef,
    scrollContainerRef: scroll.scrollContainerRef,
    menuRef: sessions.menuRef,
    handleScroll: scroll.handleScroll,
    handleToggleMenu: sessions.handleToggleMenu,
    handleNewSession: sessions.handleNewSession,
    isNewChatDisabled: sessions.isNewChatDisabled,
    handleSelectSession: sessions.handleSelectSession,
    handleStartRename: sessions.handleStartRename,
    handleSaveRename: sessions.handleSaveRename,
    handleCancelRename: sessions.handleCancelRename,
    handleDeleteSession: sessions.handleDeleteSession,
    handleSend,
    handleStop,
  };
}
