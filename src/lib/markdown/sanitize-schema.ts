import { defaultSchema, type Options } from 'rehype-sanitize';

/**
 * All MathML / KaTeX tags needed to preserve mathematical formulas in agent output.
 */
const KATEX_TAG_NAMES: string[] = [
  'math',
  'semantics',
  'mrow',
  'mi',
  'mo',
  'mn',
  'msup',
  'msub',
  'annotation',
  'span',
  'svg',
  'path',
  'style',
  'line',
  'mtext',
  'mspace',
  'mover',
  'munder',
  'munderover',
  'msubsup',
  'mfrac',
  'mroot',
  'msqrt',
  'mtable',
  'mtr',
  'mtd',
  'mlabeledtr',
  'mpadded',
  'mphantom',
];

/**
 * Strict, defense-in-depth sanitization schema for agent chat Markdown output.
 * Allows safe KaTeX MathML structures, syntax-highlighted code blocks, and GFM tables
 * while eliminating unauthorized script injections, iframes, and dangerous attributes.
 */
export const agentSanitizeSchema: Options = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    ...KATEX_TAG_NAMES,
  ],
  attributes: {
    ...defaultSchema.attributes,
    '*': [
      ...(defaultSchema.attributes?.['*'] ?? []),
      'className',
      'ariaHidden',
      'aria-hidden',
      'style',
    ],
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      'className',
      'style',
      'ariaHidden',
      'aria-hidden',
    ],
    svg: [
      'width',
      'height',
      'viewBox',
      'ariaHidden',
      'aria-hidden',
      'style',
      'preserveAspectRatio',
      'fill',
      'stroke',
    ],
    path: ['d', 'fill', 'stroke'],
    math: ['xmlns', 'display'],
    annotation: ['encoding'],
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      'className',
      'style',
    ],
    pre: [
      ...(defaultSchema.attributes?.pre ?? []),
      'className',
      'style',
    ],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      'className',
      'style',
    ],
    input: ['type', 'checked', 'disabled', 'className'],
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      'href',
      'target',
      'rel',
      'className',
    ],
    table: ['className'],
    thead: ['className'],
    tbody: ['className'],
    tr: ['className'],
    th: ['className'],
    td: ['className'],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
  },
};
