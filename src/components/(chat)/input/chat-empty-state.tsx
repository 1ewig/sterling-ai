'use client';

import React, { useRef, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { SterlingIcon } from '@/components/common';
import {
  emptyStateContainerVariants,
  emptyStateItemVariants,
  tapScalePill,
  hoverLiftPill,
} from '@/constants/animation';
import { ChatInput, type ChatInputHandle } from './chat-input';

export interface QuickActionItem {
  id: string;
  label: string;
  template: string;
}

export interface ChatEmptyStateProps {
  isLoading: boolean;
  onSend: (text: string) => Promise<void> | void;
  onStop: () => void;
  quickActions: QuickActionItem[];
}

/**
 * Pure presentation component rendering the hero empty chat state,
 * hero input dock, and quick-action template buttons.
 */
export const ChatEmptyState = memo(function ChatEmptyState({
  isLoading,
  onSend,
  onStop,
  quickActions,
}: ChatEmptyStateProps) {
  const inputRef = useRef<ChatInputHandle>(null);

  const handleSelectTemplate = useCallback((template: string) => {
    inputRef.current?.setInputText(template);
  }, []);

  return (
    <motion.div
      key="empty-state-canvas"
      variants={emptyStateContainerVariants}
      initial="hidden"
      animate="visible"
      className="absolute inset-0 flex flex-col items-center justify-center p-spacing-md sm:p-spacing-lg text-center overflow-y-auto pointer-events-auto z-20 custom-scrollbar"
    >
      <div className="my-auto flex flex-col items-center justify-center w-full py-spacing-md max-w-3xl">
          {/* Header Stack */}
          <motion.div
            variants={emptyStateItemVariants}
            className="flex flex-col items-center text-center max-w-xl mb-spacing-lg"
          >
            <div className="flex items-center justify-center mb-3.5">
              <SterlingIcon className="size-8 text-theme-brand-primary" />
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-theme-text-primary tracking-tight font-sans leading-tight">
              What are we looking at today?
            </h2>

            <p className="text-xs sm:text-sm text-theme-text-secondary mt-2 max-w-lg leading-relaxed font-normal">
              Live technicals, sentiment, and macro context across crypto and 24/7 tokenized equities.
            </p>
          </motion.div>

          {/* Hero Input */}
          <motion.div
            variants={emptyStateItemVariants}
            className="w-full max-w-2xl px-spacing-xs mb-spacing-md"
          >
            <ChatInput
              ref={inputRef}
              key="hero-input"
              isLoading={isLoading}
              onSend={onSend}
              onStop={onStop}
              className="max-w-2xl"
              containerClassName="w-full p-0 bg-transparent shrink-0"
              autoFocus
              showAura={true}
            />
          </motion.div>

          {/* Quick Action Template Pills */}
          <motion.div variants={emptyStateItemVariants} className="flex flex-col items-center gap-spacing-xs w-full">
            <div className="flex items-center justify-center mb-0.5">
              <span className="text-2xs font-bold uppercase tracking-wider text-theme-text-muted">
                Quick Briefings
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
              {quickActions.map((action) => (
                <motion.button
                  key={action.id}
                  type="button"
                  whileHover={hoverLiftPill}
                  whileTap={tapScalePill}
                  onClick={() => handleSelectTemplate(action.template)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-theme-bg-surface/80 hover:bg-theme-bg-surface active:bg-theme-bg-elevated border border-theme-border-subtle hover:border-theme-border-strong active:border-theme-border-strong text-theme-text-secondary hover:text-theme-text-primary text-xs font-medium cursor-pointer transition-colors duration-150 shadow-2xs group select-none backdrop-blur-xs"
                >
                  <span className="leading-tight">{action.label}</span>
                  <ArrowUpRight className="size-3 text-theme-text-muted group-hover:text-theme-brand-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150 shrink-0" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
  );
});
