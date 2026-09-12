'use client';

import React from 'react';
import { Newspaper, ExternalLink, Sparkles, Clock } from 'lucide-react';
import type { NewsBriefingItem } from '@/agent/types';

interface NewsBriefingCardProps {
  resultObj: Record<string, unknown>;
}

export const NewsBriefingCard = React.memo(function NewsBriefingCard({
  resultObj,
}: NewsBriefingCardProps) {
  const topic = typeof resultObj?.topic === 'string' ? resultObj.topic : 'Market Briefing';
  const headlines = Array.isArray(resultObj?.headlines)
    ? (resultObj.headlines as NewsBriefingItem[])
    : [];
  const source = typeof resultObj?.source === 'string' ? resultObj.source : 'exa_ai';
  const warning = typeof resultObj?.warning === 'string' ? resultObj.warning : undefined;

  if (headlines.length === 0) {
    return (
      <div className="p-3 rounded-lg bg-theme-bg-surface border border-theme-border-subtle text-2xs text-theme-text-muted italic">
        {warning || 'No recent news headlines found for this topic.'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-theme-bg-surface border border-theme-border-subtle shadow-sm w-full max-w-lg">
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 border-b border-theme-border-subtle/50 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded bg-theme-brand-primary/10 text-theme-brand-primary shrink-0">
            <Newspaper className="size-3.5" />
          </div>
          <span className="font-semibold text-xs text-theme-text-primary tracking-wide truncate">
            News Briefing: {topic}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-3xs font-mono px-1.5 py-0.5 rounded bg-theme-bg-elevated border border-theme-border-subtle text-theme-text-secondary flex items-center gap-1">
            <Sparkles className="size-2.5 text-theme-brand-primary" />
            {source === 'exa_ai' ? 'Live Neural' : 'Desk Baseline'}
          </span>
        </div>
      </div>

      {/* Headlines List */}
      <div className="flex flex-col gap-2 pt-0.5">
        {headlines.map((item, idx) => {
          const dateStr = item.publishedDate
            ? item.publishedDate.includes('T')
              ? item.publishedDate.split('T')[0]
              : item.publishedDate.slice(0, 10)
            : '';

          return (
            <a
              key={item.id ?? `headline_${idx}`}
              href={item.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-1 p-2 rounded-md bg-theme-bg-elevated/40 hover:bg-theme-bg-elevated border border-theme-border-subtle/60 hover:border-theme-brand-primary/40 transition-all text-left select-none"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-theme-text-primary group-hover:text-theme-brand-primary transition-colors line-clamp-2 leading-snug">
                  {item.title}
                </span>
                <ExternalLink className="size-3 text-theme-text-muted group-hover:text-theme-brand-primary shrink-0 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>

              {item.summary && (
                <p className="text-2xs text-theme-text-secondary line-clamp-2 leading-relaxed">
                  {item.summary}
                </p>
              )}

              <div className="flex items-center gap-2 pt-0.5 text-3xs font-mono text-theme-text-muted">
                {item.sourceDomain && (
                  <span className="font-semibold text-theme-text-secondary">
                    {item.sourceDomain}
                  </span>
                )}
                {dateStr && (
                  <span className="flex items-center gap-0.5">
                    <Clock className="size-2.5" />
                    {dateStr}
                  </span>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
});
