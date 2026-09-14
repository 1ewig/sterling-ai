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
  const isActive = pathname === '/assets' || pathname.startsWith('/assets/');

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
          className={`group h-10 w-full rounded-xl text-xs flex items-center justify-center overflow-hidden select-none transition-colors px-2.5 ${
            isActive
              ? 'bg-theme-brand-primary text-theme-bg-overlay font-bold cursor-pointer shadow-2xs hover:brightness-105 active:brightness-95 border border-transparent'
              : 'bg-theme-bg-elevated/40 hover:bg-theme-bg-elevated text-theme-text-secondary hover:text-theme-text-primary font-medium cursor-pointer border border-theme-border-subtle hover:border-theme-border-strong'
          }`}
        >
          <Wallet
            className={`size-4 shrink-0 stroke-[2.25] transition-colors ${
              isActive
                ? 'text-theme-bg-overlay'
                : 'text-theme-text-muted group-hover:text-theme-text-primary'
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
