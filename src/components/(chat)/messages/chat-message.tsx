'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { User, AlertCircle, Sparkles, ArrowUpRight } from 'lucide-react';
import { AgentLoader, ArgusIcon } from '@/components/common';
import {
  draftIndicatorVariants,
  messageEntranceVariants,
  hoverLiftPill,
  tapScalePill,
} from '@/constants/animation';
import { MarkdownView } from '../markdown-view';
import { AgentWorkGroup, AgentProcessTimeline } from '../reasoning';
import { normalizeMessageSteps } from '@/lib/db';
import { useActiveTimer } from '@/hooks';
import { stripIntermediateTextPrefix } from '@/agent/transforms';
import type { ExecutedToolCall, AgentExecutionStep } from '@/agent/types';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'success' | 'error' | 'pending';
  followUpQuestions?: string[];
  toolCalls?: ExecutedToolCall[];
  steps?: AgentExecutionStep[];
  stepCount?: number;
  workedDurationMs?: number;
  timestamp: number;
}

interface ChatMessageProps {
  message: ChatMessageData;
  isStreaming?: boolean;
  animateEntrance?: boolean;
  isLatestAssistantMessage?: boolean;
  onSelectFollowUp?: (question: string) => void;
}

/**
 * Live drafting indicator displaying elapsed execution time while the assistant prepares a response.
 */
function AgentWorkingDraftIndicator({ startedAt }: { startedAt: number }) {
  const elapsedSeconds = useActiveTimer(startedAt, true);

  return (
    <motion.div
      variants={draftIndicatorVariants}
      initial="hidden"
      animate="visible"
      className="flex items-center gap-2 text-xs sm:text-sm font-medium text-theme-text-secondary py-1.5"
    >
      <AgentLoader className="size-4.5 text-theme-brand-primary shrink-0" />
      <span>Agent working ({elapsedSeconds}s)</span>
    </motion.div>
  );
}

/**
 * Message bubble with user/assistant asymmetry.
 * Wrapped in React.memo to prevent token streaming from re-rendering the full chat history.
 */
export const ChatMessage = memo(function ChatMessage({
  message,
  isStreaming = false,
  animateEntrance = false,
  isLatestAssistantMessage = false,
  onSelectFollowUp,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';

  const shouldAnimate = animateEntrance;

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // 1. User Message (Right-aligned elevated capsule blending smoothly with architectural theme)
  if (isUser) {
    return (
      <motion.div
        variants={messageEntranceVariants}
        initial={shouldAnimate ? 'hidden' : false}
        animate="visible"
        className="flex justify-end items-start gap-spacing-xs w-full py-1"
      >
        <div className="flex flex-col items-end gap-1 max-w-[85%] sm:max-w-[75%]">
          <div className="bg-theme-bg-elevated text-theme-text-primary px-4 py-3 rounded-2xl rounded-tr-xs shadow-2xs border border-theme-border-subtle text-sm font-normal leading-relaxed break-words select-text">
            {message.content}
          </div>
          <span className="text-2xs font-mono text-theme-text-muted px-1">
            {formattedTime}
          </span>
        </div>
        <div className="size-7 rounded-full bg-theme-bg-elevated border border-theme-border-subtle flex items-center justify-center text-theme-text-secondary shrink-0 mt-0.5 shadow-2xs">
          <User className="size-3.5" />
        </div>
      </motion.div>
    );
  }

  // 2. Assistant Message
  const effectiveSteps: AgentExecutionStep[] = React.useMemo(() => {
    return normalizeMessageSteps(message, isStreaming);
  }, [message, isStreaming]);

  const hasSteps = effectiveSteps.length > 0;

  const displayContent = React.useMemo(() => {
    if (!message.content) return '';
    return stripIntermediateTextPrefix(message.content, effectiveSteps);
  }, [message.content, effectiveSteps]);

  return (
    <motion.div
      variants={messageEntranceVariants}
      initial={shouldAnimate ? 'hidden' : false}
      animate="visible"
      className="flex items-start gap-spacing-sm w-full py-1"
    >
      {/* Brand Monogram Icon */}
      <div className="size-8 rounded-xl bg-theme-bg-elevated border border-theme-border-subtle flex items-center justify-center shrink-0 shadow-2xs">
        <ArgusIcon className="size-4.5 text-theme-brand-primary shrink-0" />
      </div>

      <div className="flex-1 flex flex-col gap-spacing-xs min-w-0">
        {/* Header Bar */}
        <div className="flex items-center gap-spacing-xs text-xs text-theme-text-muted px-1">
          <span className="font-bold text-theme-text-primary tracking-tight">
            Argus
          </span>
          <span>•</span>
          <span className="font-mono text-2xs">{formattedTime}</span>
          {isError && (
            <span className="inline-flex items-center gap-1 text-2xs text-theme-status-danger font-semibold ml-1">
              <AlertCircle className="size-3 text-theme-status-danger" />
              Error
            </span>
          )}
        </div>

        {/* Chronological Process Timeline wrapped in Work Group Accordion */}
        {hasSteps && (
          <AgentWorkGroup
            steps={effectiveSteps}
            isStreaming={isStreaming}
            isCompleted={!isStreaming}
            workedDurationMs={message.workedDurationMs}
            startedAt={message.timestamp}
          >
            <AgentProcessTimeline
              steps={effectiveSteps}
              isStreaming={isStreaming}
              isCompleted={!isStreaming}
            />
          </AgentWorkGroup>
        )}

        {/* Main Response Markdown (Frameless directly on page canvas) */}
        {displayContent && (
          <div
            className={
              isError
                ? 'p-4 rounded-xl border border-theme-status-danger bg-theme-bg-surface text-theme-status-danger text-sm leading-relaxed'
                : 'text-theme-text-primary text-sm leading-relaxed pt-1 pb-1 px-0.5'
            }
          >
            <MarkdownView content={displayContent} isStreaming={isStreaming} />
          </div>
        )}

        {/* Suggested Next Steps / Follow-up Questions (Only on latest completed assistant message) */}
        {!isStreaming && isLatestAssistantMessage && message.followUpQuestions && message.followUpQuestions.length > 0 && (
          <motion.div
            variants={messageEntranceVariants}
            initial={shouldAnimate ? 'hidden' : false}
            animate="visible"
            className="flex flex-col gap-2 pt-2 pb-1"
          >
            <div className="flex items-center gap-1.5 px-0.5">
              <Sparkles className="size-3 text-theme-brand-primary shrink-0" />
              <span className="text-2xs font-bold uppercase tracking-wider text-theme-text-muted">
                Suggested Follow-ups
              </span>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              {message.followUpQuestions.map((question, idx) => (
                <motion.button
                  key={`${message.id}_fu_${idx}`}
                  type="button"
                  whileHover={hoverLiftPill}
                  whileTap={tapScalePill}
                  onClick={() => onSelectFollowUp?.(question)}
                  title={question}
                  aria-label={`Ask follow-up: ${question}`}
                  className="group inline-flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-theme-bg-surface/90 hover:bg-theme-bg-surface active:bg-theme-bg-elevated border border-theme-border-subtle hover:border-theme-border-strong text-theme-text-secondary hover:text-theme-text-primary text-xs font-medium cursor-pointer transition-colors shadow-2xs select-none backdrop-blur-xs text-left max-w-full"
                >
                  <span className="line-clamp-1 leading-snug">{question}</span>
                  <ArrowUpRight className="size-3 text-theme-text-muted group-hover:text-theme-brand-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150 shrink-0" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Live Drafting Indicator at the bottom until the inference ends */}
        {isStreaming && (
          <AgentWorkingDraftIndicator startedAt={message.timestamp} />
        )}
      </div>
    </motion.div>
  );
});
