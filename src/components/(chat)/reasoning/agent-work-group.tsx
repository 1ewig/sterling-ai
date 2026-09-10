'use client';

import React, { useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle2 } from 'lucide-react';
import { accordionVariants, tapScaleAccordion } from '@/constants/animation';
import { useAccordionOpenState } from '@/hooks';
import type { AgentExecutionStep } from '@/agent/types';

interface AgentWorkGroupProps {
  children: React.ReactNode;
  steps?: AgentExecutionStep[];
  isStreaming?: boolean;
  isCompleted?: boolean;
  workedDurationMs?: number;
  startedAt?: number;
  className?: string;
}

/**
 * Collapsible container representing an overarching agent work execution group.
 * Displays "Worked for X seconds" when completed, and automatically manages collapse state.
 */
export const AgentWorkGroup = memo(function AgentWorkGroup({
  children,
  steps = [],
  isStreaming = false,
  isCompleted = false,
  workedDurationMs,
  className = '',
}: AgentWorkGroupProps) {
  const isActiveWork = isStreaming && !isCompleted;

  // Default is open while actively working, collapsed when completed, unless explicitly toggled by user
  const { isOpen, toggleOpen } = useAccordionOpenState(!isCompleted);

  const finalWorkedSeconds = useMemo(() => {
    return Math.max(
      1,
      Math.round(
        (workedDurationMs ??
          (steps.length > 0
            ? steps[steps.length - 1].timestamp +
              (steps[steps.length - 1].durationMs ?? 1000) -
              steps[0].timestamp
            : 1000)) / 1000
      )
    );
  }, [workedDurationMs, steps]);

  const headerLabel = `Worked for ${finalWorkedSeconds} ${finalWorkedSeconds === 1 ? 'second' : 'seconds'}`;

  return (
    <div className={`flex flex-col text-2xs mb-spacing-xs ${className}`}>
      {/* Overarching Worked Group Header (Shown at top when work is completed) */}
      {!isActiveWork && (
        <motion.button
          type="button"
          whileTap={tapScaleAccordion}
          onClick={toggleOpen}
          className="inline-flex items-center gap-1.5 py-0.5 px-1 -ml-1 rounded-md hover:bg-theme-bg-elevated/40 active:bg-theme-bg-elevated/70 text-2xs text-theme-text-secondary hover:text-theme-text-primary select-none cursor-pointer transition-colors group w-fit"
        >
          <CheckCircle2 className="size-3 text-theme-brand-primary shrink-0" />
          <span className="font-medium text-theme-text-secondary group-hover:text-theme-text-primary">
            {headerLabel}
          </span>
          <ChevronDown
            className={`size-2.5 text-theme-text-muted group-hover:text-theme-text-primary transition-transform duration-200 ease-out shrink-0 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </motion.button>
      )}

      {/* Main Collapsible Inner Container */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            variants={accordionVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
