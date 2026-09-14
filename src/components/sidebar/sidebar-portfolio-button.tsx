'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { sidebarHorizontalCollapseVariants, tapScalePill } from '@/constants/animation';

export interface SidebarPortfolioButtonProps {
  isCollapsed: boolean;
  onNavigate?: () => void;
}

export const SidebarPortfolioButton = memo(function SidebarPortfolioButton({
  isCollapsed,
  onNavigate,
}: SidebarPortfolioButtonProps) {
  const pathname = usePathname();
  const isActive = pathname === '/portfolio' || pathname.startsWith('/portfolio/');

  return (
    <div className="pt-1.5 px-3.5 shrink-0 flex items-center justify-center">
      <Link
        href="/portfolio"
        onClick={onNavigate}
        title={isCollapsed ? 'Portfolio' : undefined}
        aria-label="Portfolio"
        className="w-full"
      >
        <motion.div
          whileTap={tapScalePill}
          className={`group h-10 w-full rounded-xl text-xs flex items-center justify-start overflow-hidden select-none transition-colors ${
            isActive
              ? 'bg-theme-brand-primary text-theme-bg-overlay font-bold cursor-pointer shadow-2xs hover:brightness-105 active:brightness-95 border border-transparent'
              : 'bg-theme-bg-elevated/40 hover:bg-theme-bg-elevated text-theme-text-secondary hover:text-theme-text-primary font-medium cursor-pointer border border-theme-border-subtle hover:border-theme-border-strong'
          }`}
        >
          <div className="size-10 flex items-center justify-center shrink-0">
            <Wallet
              className={`size-4 stroke-[2.25] transition-colors ${
                isActive
                  ? 'text-theme-bg-overlay'
                  : 'text-theme-text-muted group-hover:text-theme-text-primary'
              }`}
            />
          </div>
          <motion.span
            initial={false}
            variants={sidebarHorizontalCollapseVariants}
            animate={isCollapsed ? 'collapsed' : 'expanded'}
            className="whitespace-nowrap overflow-hidden select-none truncate tracking-tight text-left pr-3"
          >
            Portfolio
          </motion.span>
        </motion.div>
      </Link>
    </div>
  );
});

export const SidebarAssetsButton = SidebarPortfolioButton;
export type SidebarAssetsButtonProps = SidebarPortfolioButtonProps;
