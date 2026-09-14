import React from 'react';
import type { Metadata } from 'next';
import { AssetsPageClient } from '@/components/(assets)';

export const metadata: Metadata = {
  title: 'Portfolio & Assets',
  description:
    'Institutional portfolio intelligence, Bitget Unified Trading Account (UTA v3) balances, collateral capacity, and spot holdings.',
  alternates: {
    canonical: '/assets',
  },
};

export default function AssetsPage() {
  return (
    <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden bg-theme-bg-base">
      <AssetsPageClient />
    </main>
  );
}
