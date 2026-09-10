'use client';

import React from 'react';
import { Newspaper, Zap } from 'lucide-react';
import type { NewsBriefingData } from '@/lib/bitget/types';

interface NewsBriefingCardProps {
  resultObj: Record<string, unknown>;
}

export const NewsBriefingCard = React.memo(function NewsBriefingCard({ resultObj }: NewsBriefingCardProps) {
  const data = resultObj as unknown as NewsBriefingData;
  const headlines = data.headlines || [];
  const narrative = data.dominantNarrative;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-theme-bg-surface border border-theme-border-subtle shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-theme-brand-primary/10 text-theme-brand-primary">
            <Newspaper className="size-3.5" />
          </div>
          <span className="font-semibold text-xs text-theme-text-primary tracking-wide">
            Market News & Narrative Briefing
          </span>
        </div>

        <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-theme-bg-elevated text-theme-text-muted">
          Live Wire
        </span>
      </div>

      {/* Narrative Callout */}
      {narrative && (
        <div className="flex items-center gap-1.5 p-1.5 rounded bg-theme-brand-primary/10 border border-theme-brand-primary/20 text-2xs font-mono text-theme-brand-primary">
          <Zap className="size-3 shrink-0" />
          <span className="font-semibold truncate">{narrative}</span>
        </div>
      )}

      {/* Headlines List */}
      <div className="flex flex-col gap-1 pt-1 border-t border-theme-border-subtle/40">
        {headlines.slice(0, 3).map((item, idx) => (
          <div key={idx} className="flex items-start justify-between gap-2 py-0.5 text-2xs">
            <span className="text-theme-text-secondary font-medium line-clamp-1 flex-1">
              • {item.headline}
            </span>
            <span className="text-3xs font-mono text-theme-text-muted shrink-0">
              {item.source}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
