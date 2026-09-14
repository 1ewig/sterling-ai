'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const isActive = pathname === '/assets';

  return (
    <div className="pt-1.5 pb-spacing-sm px-3.5 border-b border-theme-border-subtle shrink-0 flex items-center justify-center">
      <Link
        href="/assets"
        onClick={onNavigate}
        title={isCollapsed ? 'Portfolio & Assets' : undefined}
        aria-label="Portfolio & Assets"
        className={`h-9 w-full rounded-xl text-xs flex items-center justify-center overflow-hidden select-none transition-colors px-2.5 border ${
          isActive
            ? 'bg-theme-bg-elevated border-theme-brand-primary/30 text-theme-brand-primary font-bold shadow-xs'
            : 'bg-theme-bg-surface hover:bg-theme-bg-elevated border-theme-border-subtle text-theme-text-secondary hover:text-theme-text-primary active:bg-theme-bg-surface font-medium'
        }`}
      >
        <motion.div
          whileTap={tapScalePill}
          className="flex items-center justify-center w-full min-w-0"
        >
          <Wallet
            className={`size-4 shrink-0 transition-colors ${
              isActive ? 'text-theme-brand-primary stroke-[2.25]' : 'text-theme-text-muted stroke-[2]'
            }`}
          />
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
