'use client';

import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { WebSearchCard } from './web-search-card';
import { MarketDataCard } from './market-data-card';
import { TechnicalAnalysisCard } from './technical-analysis-card';
import { MacroAnalystCard } from './macro-analyst-card';
import { SentimentAnalystCard } from './sentiment-analyst-card';
import { MarketIntelCard } from './market-intel-card';
import type { ToolDisplayInfo, ToolResultCardProps } from './types';
import { getToolDisplayInfo } from './display-info';

export type { ToolDisplayInfo, ToolResultCardProps };
export { getToolDisplayInfo };

/**
 * Organizes tool results into sleek, compact presentation widgets.
 */
export const ToolResultCard = React.memo(function ToolResultCard({
  toolName,
  toolResult,
}: ToolResultCardProps) {
  const resultObj =
    toolResult && typeof toolResult === 'object' ? (toolResult as Record<string, unknown>) : null;

  const isError = resultObj?.success === false || Boolean(resultObj?.error);
  const errorMessage = typeof resultObj?.error === 'string' ? resultObj.error : null;

  const renderContent = () => {
    if (isError) {
      return (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-theme-status-danger/10 border border-theme-status-danger/20 text-theme-status-danger text-xs font-medium">
          <AlertCircle className="size-3.5 shrink-0" />
          <span className="truncate">{errorMessage ?? 'Tool Execution Error'}</span>
        </div>
      );
    }

    if (!toolResult || !resultObj) {
      return (
        <span className="text-theme-text-muted text-xs italic py-1">
          No results found
        </span>
      );
    }

    switch (toolName) {
      case 'web_search':
      case 'search_crypto_news':
        return <WebSearchCard resultObj={resultObj} />;

      case 'market_data':
        return <MarketDataCard resultObj={resultObj} />;

      case 'technical_analysis':
        return <TechnicalAnalysisCard resultObj={resultObj} />;

      case 'macro_analyst':
        return <MacroAnalystCard resultObj={resultObj} />;

      case 'sentiment_analyst':
        return <SentimentAnalystCard resultObj={resultObj} />;

      case 'market_intel':
        return <MarketIntelCard resultObj={resultObj} />;

      default: {
        const entries = Object.entries(resultObj).filter(([k]) => k !== 'success');
        if (entries.length === 0) {
          return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-bg-elevated/40 border border-theme-border-subtle/80 text-xs text-theme-text-secondary">
              <CheckCircle2 className="size-3.5 text-theme-brand-primary shrink-0" />
              <span className="font-medium">Action completed</span>
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-theme-bg-elevated/40 border border-theme-border-subtle/80 text-xs text-theme-text-secondary">
            <div className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-theme-text-muted pb-1 border-b border-theme-border-subtle/40">
              <CheckCircle2 className="size-3 text-theme-brand-primary shrink-0" />
              <span>{toolName || 'Tool'} output</span>
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar font-mono text-2xs">
              <pre className="text-theme-text-primary whitespace-pre-wrap break-all font-mono">
                {JSON.stringify(resultObj, null, 2)}
              </pre>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="w-full max-w-lg transition-all duration-200">
      {renderContent()}
    </div>
  );
});
