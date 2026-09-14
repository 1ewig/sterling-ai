import React from 'react';
import type { Metadata } from 'next';
import { OrdersPageClient } from '@/components/(orders)';

export const metadata: Metadata = {
  title: 'Positions & Active Orders',
  description:
    'Institutional execution desk, live Bitget Unified Trading Account (UTA v3) derivatives positions, real-time mark PnL, and working order management.',
  alternates: {
    canonical: '/orders',
  },
};

export default function OrdersPage() {
  return (
    <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden bg-theme-bg-base">
      <OrdersPageClient />
    </main>
  );
}
