import React from 'react';
import type { Metadata } from 'next';
import { ChatPageClient } from '@/components/chat-page.client';

export const metadata: Metadata = {
  title: 'Trading Desk Stage',
  description:
    'Institutional AI chat stage featuring real-time reasoning timelines, pure TypeScript quantitative indicators, and live Bitget V3 market streaming.',
  alternates: {
    canonical: '/chat',
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Sterling AI Trading Desk',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'All',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  description:
    'Institutional AI Trading Desk and Cross-Asset Intelligence Workbench for continuous crypto and tokenized US equities trading.',
  featureList: [
    'Sub-50ms Bitget Unified V3 WebSocket Market Streamer',
    '8-Level L2 Order Book Depth Ladder with Imbalance Models',
    '30-Minute Quadratic Bézier Micro-Trend SVG Sparklines',
    '23 Pure TypeScript Quantitative Technical Indicators',
    'DeFiLlama Multi-Chain TVL & Stablecoin Intelligence',
    'Exa AI Institutional News & Narrative Briefing',
    'Human-in-the-Loop Staged Order Execution with HMAC-SHA256 Signing',
  ],
};

export default function ChatPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden bg-theme-bg-base">
        <ChatPageClient />
      </main>
    </>
  );
}

