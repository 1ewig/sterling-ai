import { useState, useEffect } from 'react';
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

// Theme imports
import githubDarkDefault from 'shiki/themes/github-dark-default.mjs';
import githubLightDefault from 'shiki/themes/github-light-default.mjs';

// Language grammar imports (zero-network, client-safe bundle)
import langJavascript from 'shiki/langs/javascript.mjs';
import langTypescript from 'shiki/langs/typescript.mjs';
import langTsx from 'shiki/langs/tsx.mjs';
import langJsx from 'shiki/langs/jsx.mjs';
import langPython from 'shiki/langs/python.mjs';
import langBash from 'shiki/langs/bash.mjs';
import langJson from 'shiki/langs/json.mjs';
import langYaml from 'shiki/langs/yaml.mjs';
import langHtml from 'shiki/langs/html.mjs';
import langCss from 'shiki/langs/css.mjs';
import langSql from 'shiki/langs/sql.mjs';
import langMarkdown from 'shiki/langs/markdown.mjs';
import langDiff from 'shiki/langs/diff.mjs';
import langRust from 'shiki/langs/rust.mjs';
import langGo from 'shiki/langs/go.mjs';

const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  golang: 'go',
  rs: 'rust',
  htm: 'html',
};

const SUPPORTED_LANGUAGES = new Set([
  'javascript',
  'typescript',
  'tsx',
  'jsx',
  'python',
  'bash',
  'json',
  'yaml',
  'html',
  'css',
  'sql',
  'markdown',
  'diff',
  'rust',
  'go',
]);

/**
 * Normalizes input language string into a canonical grammar identifier.
 */
export function normalizeLanguage(lang?: string): string {
  if (!lang) return 'text';
  const clean = lang.toLowerCase().trim();
  const resolved = LANGUAGE_ALIASES[clean] ?? clean;
  return SUPPORTED_LANGUAGES.has(resolved) ? resolved : 'text';
}

// In-memory token cache for instant synchronous re-renders
const highlightCache = new Map<string, string>();

let highlighterPromise: Promise<HighlighterCore> | null = null;

/**
 * Lazy singleton instance using pure JavaScript regex engine (zero WASM, 100% Next.js client safe).
 */
export function getHighlighterInstance(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [githubDarkDefault, githubLightDefault],
      langs: [
        langJavascript,
        langTypescript,
        langTsx,
        langJsx,
        langPython,
        langBash,
        langJson,
        langYaml,
        langHtml,
        langCss,
        langSql,
        langMarkdown,
        langDiff,
        langRust,
        langGo,
      ],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighterPromise;
}

export interface HighlightResult {
  html: string | null;
  isHighlighted: boolean;
}

/**
 * Highlights a snippet of code using the Shiki singleton.
 * Returns null if the language is unsupported/plain-text or if an error occurs.
 */
export async function highlightSnippet(
  code: string,
  rawLanguage?: string,
  theme: 'dark' | 'light' = 'dark'
): Promise<string | null> {
  const lang = normalizeLanguage(rawLanguage);
  if (lang === 'text') return null;

  const themeName = theme === 'light' ? 'github-light-default' : 'github-dark-default';
  const cacheKey = `${themeName}:${lang}:${code}`;

  const cached = highlightCache.get(cacheKey);
  if (cached) return cached;

  try {
    const highlighter = await getHighlighterInstance();
    const rawHtml = highlighter.codeToHtml(code, {
      lang,
      theme: themeName,
    });

    // Extract the inner code HTML without the outer <pre> wrapper so our component
    // retains full architectural styling authority and theme borders
    const codeMatch = /<code[^>]*>([\s\S]*?)<\/code>/.exec(rawHtml);
    const innerHtml = codeMatch ? codeMatch[1] : rawHtml;

    // Retain up to 500 cached snippets in memory to prevent memory bloat
    if (highlightCache.size > 500) {
      const firstKey = highlightCache.keys().next().value;
      if (firstKey) highlightCache.delete(firstKey);
    }

    highlightCache.set(cacheKey, innerHtml);
    return innerHtml;
  } catch {
    return null;
  }
}

/**
 * Synchronous lookup from memory cache.
 */
export function getCachedHighlight(
  code: string,
  rawLanguage?: string,
  theme: 'dark' | 'light' = 'dark'
): string | null {
  const lang = normalizeLanguage(rawLanguage);
  if (lang === 'text') return null;
  const themeName = theme === 'light' ? 'github-light-default' : 'github-dark-default';
  return highlightCache.get(`${themeName}:${lang}:${code}`) ?? null;
}

/**
 * React hook for asynchronous, non-blocking syntax highlighting with zero layout shift.
 */
export function useHighlightedCode(
  code: string,
  language?: string,
  theme: 'dark' | 'light' = 'dark'
): HighlightResult {
  const cached = getCachedHighlight(code, language, theme);
  const [asyncHtml, setAsyncHtml] = useState<string | null>(null);

  useEffect(() => {
    if (cached) return;

    const lang = normalizeLanguage(language);
    if (lang === 'text') return;

    let isMounted = true;
    highlightSnippet(code, language, theme).then((res) => {
      if (isMounted) {
        setAsyncHtml(res);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [code, language, theme, cached]);

  const effectiveHtml = cached ?? asyncHtml;

  return {
    html: effectiveHtml,
    isHighlighted: Boolean(effectiveHtml),
  };
}
