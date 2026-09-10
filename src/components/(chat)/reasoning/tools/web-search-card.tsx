import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { ToolCardProps } from './types';

export function WebSearchCard({ resultObj }: ToolCardProps) {
  const articles = Array.isArray(resultObj?.articles)
    ? (resultObj.articles as Array<{
        id?: string;
        title?: string;
        url?: string;
        publishedDate?: string;
      }>)
    : [];

  if (articles.length === 0) {
    return (
      <span className="text-theme-text-muted text-2xs italic py-0.5">
        {typeof resultObj?.warning === 'string' ? resultObj.warning : 'No results found'}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 pt-0.5 max-w-full">
      {articles.map((article, idx) => {
        let hostname = '';
        try {
          if (article.url) {
            hostname = new URL(article.url).hostname.replace(/^www\./, '');
          }
        } catch {
          hostname = '';
        }

        return (
          <a
            key={article.id ?? `src_${idx}`}
            href={article.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            title={article.title}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-theme-bg-elevated/50 hover:bg-theme-bg-elevated border border-theme-border-subtle/70 hover:border-theme-border-strong text-2xs text-theme-text-secondary hover:text-theme-text-primary transition-colors group select-none max-w-xs truncate"
          >
            {hostname && (
              <span className="font-mono text-3xs text-theme-text-muted group-hover:text-theme-text-secondary truncate shrink-0">
                {hostname}
              </span>
            )}
            <span className="truncate font-medium">{article.title || 'Source'}</span>
            <ExternalLink className="size-2.5 text-theme-text-muted group-hover:text-theme-brand-primary shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
          </a>
        );
      })}
    </div>
  );
}
