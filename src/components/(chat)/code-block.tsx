'use client';

import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { hoverScaleIcon, tapScaleIcon } from '@/constants/animation';
import { useHighlightedCode } from '@/lib/markdown/shiki-highlighter';
import { useTheme } from '@/hooks/ui/use-theme';

export interface CodeBlockProps {
  language?: string;
  code: string;
  children?: React.ReactNode;
}

/**
 * Production-ready Code Block component with:
 * - Asynchronous Shiki syntax highlighting (zero layout shift fallback)
 * - Automatic Obsidian/Slate dark and Light theme adaptation
 * - Tactile one-click copy to clipboard with status feedback
 * - Architectural design token borders and scrollbars
 */
export const CodeBlock = memo(function CodeBlock({
  language,
  code,
  children,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();

  const effectiveTheme = theme === 'light' ? 'light' : 'dark';
  const { html, isHighlighted } = useHighlightedCode(code, language, effectiveTheme);

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is unavailable
    }
  };

  const displayLanguage = language ? language.toUpperCase() : 'CODE';

  return (
    <div className="relative my-3 rounded-xl border border-theme-border-subtle bg-theme-bg-surface overflow-hidden font-mono text-2xs group shadow-2xs">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-theme-bg-elevated border-b border-theme-border-subtle text-theme-text-muted select-none">
        <span className="font-extrabold text-2xs uppercase tracking-widest text-theme-text-secondary">
          {displayLanguage}
        </span>
        <motion.button
          type="button"
          whileHover={hoverScaleIcon}
          whileTap={tapScaleIcon}
          onClick={handleCopy}
          aria-label="Copy code"
          className="inline-flex items-center gap-1.5 text-2xs text-theme-text-muted hover:text-theme-text-primary py-0.5 px-2 rounded-md transition-colors cursor-pointer hover:bg-theme-bg-surface active:bg-theme-bg-surface border border-transparent hover:border-theme-border-subtle select-none"
        >
          {copied ? (
            <>
              <Check className="size-3 text-theme-status-success" />
              <span className="text-theme-status-success font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Copy</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Code Content Body */}
      {isHighlighted && html ? (
        <pre className="p-3.5 overflow-x-auto font-mono text-2xs leading-relaxed text-theme-text-primary whitespace-pre m-0 custom-scrollbar">
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      ) : (
        <pre className="p-3.5 overflow-x-auto font-mono text-2xs leading-relaxed text-theme-text-primary whitespace-pre m-0 custom-scrollbar">
          <code>{children ?? code}</code>
        </pre>
      )}
    </div>
  );
});
