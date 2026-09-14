'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { sidebarHorizontalCollapseVariants, tapScalePill } from '@/constants/animation';

export interface SidebarOrdersButtonProps {
  isCollapsed: boolean;
  onNavigate?: () => void;
}

export const SidebarOrdersButton = memo(function SidebarOrdersButton({
  isCollapsed,
  onNavigate,
}: SidebarOrdersButtonProps) {
  const pathname = usePathname();
  const isActive = pathname === '/orders' || pathname.startsWith('/orders/');

  return (
    <div className="pt-1.5 pb-spacing-sm px-3.5 border-b border-theme-border-subtle shrink-0 flex items-center justify-center">
      <Link
        href="/orders"
        onClick={onNavigate}
        title={isCollapsed ? 'Positions & Orders' : undefined}
        aria-label="Positions & Orders"
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
            <Activity
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
            Positions & Orders
          </motion.span>
        </motion.div>
      </Link>
    </div>
  );
});
