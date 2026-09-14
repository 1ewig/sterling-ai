'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Layers, Bot, ArrowRight } from 'lucide-react';
import { tapScalePill } from '@/constants/animation';

export function OrdersEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 rounded-2xl bg-theme-bg-surface border border-theme-border-subtle text-center shadow-2xs">
      <div className="size-14 rounded-2xl bg-theme-bg-elevated border border-theme-border-subtle flex items-center justify-center text-theme-text-muted mb-4 shadow-inner">
        <Layers className="size-7 stroke-[1.5]" />
      </div>

      <h3 className="text-base font-bold text-theme-text-primary tracking-tight mb-1">
        No Active Positions or Working Orders
      </h3>
      <p className="text-xs text-theme-text-secondary max-w-md mb-6 leading-relaxed">
        You currently have zero active derivative contracts and no unfilled resting orders on Bitget Unified Trading Account (UTA v3).
      </p>

      <Link href="/chat">
        <motion.button
          type="button"
          whileTap={tapScalePill}
          className="h-9 px-4 rounded-xl text-xs font-bold bg-theme-brand-primary text-theme-bg-overlay flex items-center gap-2 shadow-2xs hover:brightness-105 active:brightness-95 cursor-pointer select-none transition-all"
        >
          <Bot className="size-4" />
          <span>Stage New Setup in Agent Chat</span>
          <ArrowRight className="size-3.5" />
        </motion.button>
      </Link>
    </div>
  );
}
