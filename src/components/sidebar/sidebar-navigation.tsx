'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bot, Wallet } from 'lucide-react';
import { sidebarHorizontalCollapseVariants, tapScalePill } from '@/constants/animation';

export interface SidebarNavigationProps {
  isCollapsed: boolean;
  onNavigate?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Agent Desk',
    href: '/chat',
    icon: Bot,
  },
  {
    label: 'Portfolio & Assets',
    href: '/assets',
    icon: Wallet,
  },
];

export const SidebarNavigation = memo(function SidebarNavigation({
  isCollapsed,
  onNavigate,
}: SidebarNavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="py-spacing-xs px-2.5 flex flex-col gap-1 shrink-0 border-b border-theme-border-subtle" aria-label="Main Navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href === '/chat' && pathname === '/');
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={isCollapsed ? item.label : undefined}
            className={`group relative flex items-center h-9 rounded-xl px-2.5 transition-colors select-none ${
              isActive
                ? 'bg-theme-bg-elevated text-theme-brand-primary font-semibold shadow-xs'
                : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-elevated/50'
            }`}
          >
            <motion.div
              whileTap={tapScalePill}
              className="flex items-center w-full min-w-0"
            >
              <div className="size-5 flex items-center justify-center shrink-0">
                <Icon
                  className={`size-4 transition-colors ${
                    isActive
                      ? 'text-theme-brand-primary stroke-[2.25]'
                      : 'text-theme-text-muted group-hover:text-theme-text-primary stroke-[2]'
                  }`}
                />
              </div>

              <motion.span
                initial={false}
                variants={sidebarHorizontalCollapseVariants}
                animate={isCollapsed ? 'collapsed' : 'expanded'}
                className="whitespace-nowrap overflow-hidden select-none truncate tracking-tight text-xs pl-2.5"
              >
                {item.label}
              </motion.span>
            </motion.div>
          </Link>
        );
      })}
    </nav>
  );
});
