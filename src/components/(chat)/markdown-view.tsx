'use client';

import React, { createContext, useContext, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize from 'rehype-sanitize';
import { ExternalLink } from 'lucide-react';
import { agentSanitizeSchema } from '@/lib/markdown';
import { CodeBlock } from './code-block';

const InsidePreContext = createContext<boolean>(false);

const REMARK_PLUGINS: React.ComponentProps<typeof ReactMarkdown>['remarkPlugins'] = [
  remarkGfm,
  [remarkMath, { singleDollarTextMath: false }],
];

const REHYPE_PLUGINS: React.ComponentProps<typeof ReactMarkdown>['rehypePlugins'] = [
  [rehypeKatex, { strict: false, throwOnError: false }],
  [rehypeSanitize, agentSanitizeSchema],
];

/**
 * Stable, module-level Markdown component map adhering to design tokens.
 * Declaring this statically prevents re-instantiating component closures on every token chunk,
 * allowing ReactMarkdown and React to preserve DOM node identity during streaming.
 */
const MARKDOWN_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: ({ children }) => (
    <h1 className="text-lg sm:text-xl font-extrabold text-theme-text-primary mt-5 mb-2.5 first:mt-0 tracking-tight font-sans">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-theme-text-primary mt-4 mb-2 first:mt-0 border-b border-theme-border-subtle pb-1.5">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-bold text-theme-text-primary mt-3.5 mb-1.5 first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-xs font-bold uppercase tracking-wider text-theme-text-muted mt-2.5 mb-1 first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-sm text-theme-text-primary leading-relaxed mb-3 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-theme-text-primary">
      {children}
    </strong>
  ),
  em: ({ children }) => (
    <em className="italic text-theme-text-secondary">
      {children}
    </em>
  ),
  del: ({ children }) => (
    <del className="line-through text-theme-text-muted opacity-80">
      {children}
    </del>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-outside pl-4 my-3 space-y-1.5 text-sm text-theme-text-secondary marker:text-theme-brand-primary">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-4 my-3 space-y-1.5 text-sm text-theme-text-secondary marker:text-theme-brand-primary">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed pl-0.5">
      {children}
    </li>
  ),
  input: ({ type, checked, ...props }) => {
    if (type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={checked}
          readOnly
          className="size-3.5 rounded border-theme-border-subtle text-theme-brand-primary accent-theme-brand-primary mr-1.5 align-middle pointer-events-none"
          {...props}
        />
      );
    }
    return <input type={type} {...props} />;
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-theme-brand-primary bg-theme-bg-elevated/60 rounded-r-xl px-4 py-3 my-3.5 text-theme-text-primary text-sm shadow-2xs font-normal leading-relaxed">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-4 border-t border-theme-border-subtle" />
  ),
  pre: ({ children }) => {
    let codeString = '';
    let language = '';

    if (React.isValidElement(children)) {
      const codeProps = children.props as { className?: string; children?: React.ReactNode };
      language = (codeProps?.className || '').replace(/language-/, '').trim();
      const raw = codeProps?.children;
      if (typeof raw === 'string') {
        codeString = raw;
      } else if (Array.isArray(raw)) {
        codeString = raw.map((item) => (typeof item === 'string' ? item : '')).join('');
      }
    }

    return (
      <InsidePreContext.Provider value={true}>
        <CodeBlock language={language} code={codeString.replace(/\n$/, '')}>
          {children}
        </CodeBlock>
      </InsidePreContext.Provider>
    );
  },
  code: ({ className, children, ...props }) => {
    const isInsidePre = useContext(InsidePreContext);

    if (isInsidePre) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }

    return (
      <code
        className="bg-theme-bg-elevated text-theme-brand-primary px-1.5 py-0.5 rounded font-mono text-xs border border-theme-border-subtle font-semibold select-all"
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto my-3.5 rounded-xl border border-theme-border-subtle shadow-2xs bg-theme-bg-surface custom-scrollbar">
      <table className="w-full border-collapse text-xs font-mono text-left">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-theme-bg-elevated text-theme-text-secondary border-b border-theme-border-subtle select-none">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-theme-border-subtle/50 text-theme-text-primary">
      {children}
    </tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-theme-bg-elevated/40 transition-colors">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="py-2.5 px-3.5 font-bold text-xs uppercase tracking-wider text-theme-text-secondary">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="py-2.5 px-3.5 align-middle text-xs text-theme-text-primary">
      {children}
    </td>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-theme-brand-primary hover:underline font-medium hover:text-theme-brand-accent transition-colors"
    >
      <span>{children}</span>
      <ExternalLink className="size-3 shrink-0 opacity-70" />
    </a>
  ),
};

export interface MarkdownViewProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export const MarkdownView = memo(function MarkdownView({
  content,
  className = '',
}: MarkdownViewProps) {
  return (
    <div className={`w-full text-sm text-theme-text-primary leading-relaxed break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={MARKDOWN_COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});