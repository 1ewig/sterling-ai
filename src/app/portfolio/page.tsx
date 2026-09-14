import React from 'react';
import type { Metadata } from 'next';
import { PortfolioPageClient } from '@/components/(portfolio)';

export const metadata: Metadata = {
  title: 'Portfolio & Margin Desk',
  description:
    'Institutional portfolio intelligence, Bitget Unified Trading Account (UTA v3) balances, collateral capacity, and spot holdings.',
  alternates: {
    canonical: '/portfolio',
  },
};

export default function PortfolioPage() {
  return (
    <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden bg-theme-bg-base">
      <PortfolioPageClient />
    </main>
  );
}
