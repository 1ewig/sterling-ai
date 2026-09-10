'use client';

import React, { useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { getToolDisplayInfo, ToolResultCard } from './tools';
import { AgentThoughtAccordion } from './agent-thought-accordion';
import { MarkdownView } from '../markdown-view';
import { accordionVariants, tapScaleAccordion } from '@/constants/animation';
import type { AgentExecutionStep } from '@/agent/types';

export interface AgentProcessTimelineProps {
  steps: AgentExecutionStep[];
  isStreaming?: boolean;
  isCompleted?: boolean;
  className?: string;
}

/**
 * Pure chronological process timeline rendering thinking accordions,
 * intermediate reasoning text, and interactive tool execution cards.
 */
export const AgentProcessTimeline = memo(function AgentProcessTimeline({
  steps,
  isStreaming = false,
  isCompleted = false,
  className = '',
}: AgentProcessTimelineProps) {
  const [expandedDetailsIds, setExpandedDetailsIds] = useState<Record<string, boolean>>({});

  // Only display thinking steps that contain actual reasoning content or are actively thinking
  const visibleSteps = useMemo(() => {
    if (!steps || steps.length === 0) return [];
    return steps.filter((step) => {
      if (step.type === 'thinking') {
        return Boolean(step.reasoningText?.trim()) || (isStreaming && step.status === 'active');
      }
      return true;
    });
  }, [steps, isStreaming]);

  const toggleDetails = useCallback((id: string) => {
    setExpandedDetailsIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  if (visibleSteps.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-spacing-xs pl-3.5 border-l-2 border-theme-brand-primary/30 pt-2 pb-1 ${className}`}>
      {visibleSteps.map((step, idx) => {
        if (step.type === 'thinking') {
          return (
            <AgentThoughtAccordion
              key={step.id ?? `think_${idx}`}
              step={step}
              isStreaming={isStreaming}
            />
          );
        }

        if (step.type === 'intermediate_text') {
          return (
            <div
              key={step.id ?? `interm_${idx}`}
              className="py-1 text-xs text-theme-text-secondary leading-relaxed select-text"
            >
              <MarkdownView content={step.intermediateText || ''} />
            </div>
          );
        }

        const isActive = step.status === 'active' && !isCompleted;
        const isStepError = step.status === 'error' || (step.status === 'active' && isCompleted);
        const isDetailsOpen = Boolean(expandedDetailsIds[step.id]);
        const effectiveToolResult =
          step.toolResult ??
          (isStepError
            ? { success: false, error: 'Search Error' }
            : undefined);
        const hasToolData = Boolean(step.toolArgs || effectiveToolResult);

        const displayInfo = getToolDisplayInfo(step.toolName, step.toolArgs);
        const ToolIcon = displayInfo.icon;

        return (
          <div key={step.id ?? `tool_${idx}`} className="flex flex-col gap-0.5">
            <div className="flex flex-col py-0.5">
              <div className="flex flex-wrap items-center gap-spacing-xs py-0.5">
                <motion.button
                  type="button"
                  whileTap={hasToolData ? tapScaleAccordion : undefined}
                  onClick={() => hasToolData && toggleDetails(step.id)}
                  className={`flex items-center gap-1.5 text-left transition-colors select-none w-fit py-0.5 px-1 -ml-1 rounded-md ${
                    hasToolData
                      ? 'cursor-pointer group text-theme-text-secondary hover:text-theme-text-primary active:bg-theme-bg-elevated/60'
                      : 'cursor-default text-theme-text-muted'
                  }`}
                >
                  {isActive ? (
                    <Loader2 className="size-3 text-theme-brand-primary animate-spin shrink-0" />
                  ) : isStepError ? (
                    <AlertCircle className="size-3 text-theme-status-danger shrink-0" />
                  ) : (
                    <ToolIcon className="size-3 text-theme-brand-primary shrink-0" />
                  )}
                  <span
                    className={`text-2xs ${
                      isActive
                        ? 'text-theme-text-primary font-semibold'
                        : isStepError
                          ? 'text-theme-status-danger font-medium'
                          : hasToolData
                            ? 'text-theme-text-secondary group-hover:text-theme-text-primary font-medium'
                            : 'text-theme-text-muted'
                    }`}
                  >
                    {displayInfo.title}
                  </span>
                  {hasToolData && (
                    <ChevronDown
                      className={`size-2.5 text-theme-text-muted group-hover:text-theme-text-primary transition-transform duration-200 ease-out shrink-0 ${
                        isDetailsOpen ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  )}
                </motion.button>
              </div>

              {/* Tool Arguments/Results Drawer */}
              <AnimatePresence initial={false}>
                {hasToolData && isDetailsOpen && (
                  <motion.div
                    variants={accordionVariants}
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                    className="overflow-hidden"
                  >
                    <div className="ml-4 pt-1.5 pb-0.5">
                      <ToolResultCard
                        toolName={step.toolName}
                        toolArgs={step.toolArgs}
                        toolResult={effectiveToolResult}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
});
