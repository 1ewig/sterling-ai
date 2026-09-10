'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, Sparkles } from 'lucide-react';
import { AgentLoader } from '@/components/common';
import { accordionVariants, tapScaleAccordion } from '@/constants/animation';
import { useActiveTimer, useAccordionOpenState } from '@/hooks';
import { MarkdownView } from '../markdown-view';
import type { AgentExecutionStep } from '@/agent/types';

interface AgentThoughtAccordionProps {
  step: AgentExecutionStep;
  isStreaming?: boolean;
}

/**
 * Dedicated Thought Accordion rendering a single reasoning phase with MarkdownView.
 * Ensures multi-turn agent thinking steps render chronologically without merging.
 * Memoized to prevent re-rendering when other stream steps update.
 */
export const AgentThoughtAccordion = memo(function AgentThoughtAccordion({
  step,
  isStreaming = false,
}: AgentThoughtAccordionProps) {
  const isActive = isStreaming && step.status === 'active';
  const reasoningText = step.reasoningText?.trim() || '';

  // Synchronized open state across stream status & user toggle
  const { isOpen: isExpanded, toggleOpen } = useAccordionOpenState(isActive);

  // Unified synchronized timer that only runs while actively thinking
  const elapsedSeconds = useActiveTimer(step.timestamp, isActive);

  // If there's no text yet and this phase is not actively streaming, omit it
  if (!reasoningText && !isActive) {
    return null;
  }

  const isCompleted = !isActive && (reasoningText.length > 0 || Boolean(step.durationMs));

  // Compute final thought duration in seconds without calling impure Date.now() during render
  const completedDurationSeconds = Math.max(
    1,
    step.durationMs ? Math.round(step.durationMs / 1000) : elapsedSeconds
  );

  const headerLabel = isActive
    ? `Thinking (${elapsedSeconds}s)`
    : `Thought for ${completedDurationSeconds} ${completedDurationSeconds === 1 ? 'second' : 'seconds'}`;

  return (
    <div className="flex flex-col text-2xs py-0.5">
      {/* Clean Accordion Trigger with Tactile Press/Touch Feedback */}
      <motion.button
        type="button"
        whileTap={tapScaleAccordion}
        onClick={toggleOpen}
        className="inline-flex items-center gap-1.5 py-0.5 px-1 -ml-1 rounded-md text-2xs text-theme-text-secondary hover:text-theme-text-primary active:bg-theme-bg-elevated/60 transition-colors cursor-pointer group select-none w-fit"
      >
        {isActive ? (
          <AgentLoader className="size-3 text-theme-brand-primary shrink-0" />
        ) : isCompleted ? (
          <Sparkles className="size-3 text-theme-brand-primary shrink-0" />
        ) : (
          <Brain className="size-3 text-theme-brand-primary shrink-0" />
        )}

        <span className="text-2xs font-medium text-theme-text-secondary group-hover:text-theme-text-primary">
          {headerLabel}
        </span>

        <ChevronDown
          className={`size-2.5 text-theme-text-muted group-hover:text-theme-text-primary transition-transform duration-200 ease-out shrink-0 ${
            isExpanded ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </motion.button>

      {/* Expanded Markdown Content (Card container removed, indented naturally) */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            variants={accordionVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="overflow-hidden"
          >
            <div className="pl-4 py-1 max-h-72 overflow-y-auto text-xs text-theme-text-secondary leading-relaxed select-text">
              {reasoningText ? (
                <MarkdownView content={reasoningText} />
              ) : isActive ? (
                <div className="flex items-center gap-1.5 text-2xs text-theme-text-muted italic py-0.5">
                  <AgentLoader className="size-2.5 text-theme-brand-primary shrink-0" />
                  <span>Thinking ({elapsedSeconds}s)</span>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
