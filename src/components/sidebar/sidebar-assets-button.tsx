'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { sidebarHorizontalCollapseVariants, tapScalePill } from '@/constants/animation';

export interface SidebarAssetsButtonProps {
  isCollapsed: boolean;
  onNavigate?: () => void;
}

export const SidebarAssetsButton = memo(function SidebarAssetsButton({
  isCollapsed,
  onNavigate,
}: SidebarAssetsButtonProps) {
  return (
    <div className="pt-1.5 pb-spacing-sm px-3.5 border-b border-theme-border-subtle shrink-0 flex items-center justify-center">
      <Link
        href="/assets"
        onClick={onNavigate}
        title={isCollapsed ? 'Portfolio & Assets' : undefined}
        aria-label="Portfolio & Assets"
        className="w-full"
      >
        <motion.div
          whileTap={tapScalePill}
          className="h-10 w-full rounded-xl font-bold text-xs flex items-center justify-center overflow-hidden select-none transition-colors px-2.5 bg-theme-brand-primary text-theme-bg-overlay cursor-pointer shadow-2xs hover:brightness-105 active:brightness-95"
        >
          <Wallet className="size-4 shrink-0 stroke-[2.25]" />
          <motion.span
            initial={false}
            variants={sidebarHorizontalCollapseVariants}
            animate={isCollapsed ? 'collapsed' : 'expanded'}
            className="whitespace-nowrap overflow-hidden select-none truncate tracking-tight pl-1.5"
          >
            Portfolio & Assets
          </motion.span>
        </motion.div>
      </Link>
    </div>
  );
});
