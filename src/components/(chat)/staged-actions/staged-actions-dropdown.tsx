'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  TrendingUp,
  Ban,
  ShieldAlert,
} from 'lucide-react';
import type { StagedTradeItem, StagedActionCounts } from '@/hooks/chat';
import { tapScalePill, dropdownMenuVariants } from '@/constants/animation';
import { StagedActionRow } from './staged-action-row';

type StagedTab = 'all' | 'orders' | 'cancels' | 'closes';

const TABS: ReadonlyArray<{
  id: StagedTab;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  countKey: keyof StagedActionCounts;
}> = [
  { id: 'all', label: 'All', countKey: 'total' },
  { id: 'orders', label: 'Orders', icon: TrendingUp, iconColor: 'text-theme-status-success', countKey: 'orders' },
  { id: 'cancels', label: 'Cancels', icon: Ban, iconColor: 'text-theme-status-warning', countKey: 'cancels' },
  { id: 'closes', label: 'Exits', icon: ShieldAlert, iconColor: 'text-theme-status-danger', countKey: 'closes' },
];

export interface StagedActionsDropdownProps {
  counts: StagedActionCounts;
  activeActions: StagedTradeItem[];
  orders: StagedTradeItem[];
  cancels: StagedTradeItem[];
  closes: StagedTradeItem[];
  now: number;
  onSelectAction: (id: string) => void;
  onDiscardAction: (id: string) => void;
  hasHydrated?: boolean;
}

export const StagedActionsDropdown = React.memo(function StagedActionsDropdown({
  counts,
  activeActions,
  orders,
  cancels,
  closes,
  now,
  onSelectAction,
  onDiscardAction,
  hasHydrated = true,
}: StagedActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<StagedTab>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelectAction(id);
      setIsOpen(false);
    },
    [onSelectAction]
  );

  const handleDiscard = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onDiscardAction(id);
      if (counts.total <= 1) {
        setIsOpen(false);
      }
    },
    [onDiscardAction, counts.total]
  );

  if (!hasHydrated || counts.total === 0) {
    return null;
  }

  const displayedActions =
    activeTab === 'orders'
      ? orders
      : activeTab === 'cancels'
        ? cancels
        : activeTab === 'closes'
          ? closes
          : activeActions;

  const sections = [
    { key: 'orders', title: 'Trade Orders', items: orders, badgeColor: 'text-theme-text-muted' },
    { key: 'cancels', title: 'Order Cancellations', items: cancels, badgeColor: 'text-theme-status-warning' },
    { key: 'closes', title: 'Position Exits', items: closes, badgeColor: 'text-theme-status-danger' },
  ] as const;

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* Trigger Pill Button */}
      <motion.button
        type="button"
        whileTap={tapScalePill}
        onClick={() => setIsOpen((prev) => !prev)}
        title={`${counts.total} staged action${counts.total > 1 ? 's' : ''} awaiting confirmation`}
        aria-label="Staged Actions Drawer"
        aria-expanded={isOpen}
        className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 select-none transition-colors border cursor-pointer ${
          isOpen
            ? 'bg-theme-brand-primary/15 text-theme-brand-primary border-theme-brand-primary/30 shadow-2xs'
            : 'bg-theme-bg-surface hover:bg-theme-bg-elevated text-theme-text-secondary hover:text-theme-text-primary border-theme-border-subtle'
        }`}
      >
        <Layers className="size-3.5" />
        <span className="hidden sm:inline">Staged</span>
        <span>({counts.total})</span>
      </motion.button>

      {/* Overflow Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-2xs sm:hidden"
              aria-hidden="true"
            />

            <motion.div
              variants={dropdownMenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-x-3 top-16 sm:inset-x-auto sm:absolute sm:right-0 sm:top-full sm:mt-1.5 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-xl bg-theme-bg-surface border border-theme-border-subtle shadow-2xl overflow-hidden z-40 flex flex-col"
            >
              {/* Menu Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-theme-border-subtle/50 bg-theme-bg-elevated/30">
                <div className="flex items-center gap-1.5">
                  <Layers className="size-3.5 text-theme-brand-accent" />
                  <span className="text-2xs font-bold uppercase tracking-wider text-theme-text-primary">
                    Staged Actions ({counts.total})
                  </span>
                </div>
                <span className="text-2xs text-theme-text-muted">Click to review ticket</span>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1 p-1.5 border-b border-theme-border-subtle/40 bg-theme-bg-base/50 text-2xs font-mono">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const tabCount = counts[tab.countKey];
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 py-1 px-1.5 sm:px-2 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer select-none ${
                        isActive
                          ? 'bg-theme-bg-elevated text-theme-text-primary font-bold border border-theme-border-subtle'
                          : 'text-theme-text-muted hover:text-theme-text-primary'
                      }`}
                    >
                      {Icon && <Icon className={`size-3 shrink-0 hidden xs:inline ${tab.iconColor || ''}`} />}
                      <span className="truncate">{tab.label}</span>
                      <span className="text-2xs opacity-80 shrink-0">({tabCount})</span>
                    </button>
                  );
                })}
              </div>

            {/* List of Staged Actions */}
            <div className="flex flex-col max-h-72 overflow-y-auto divide-y divide-theme-border-subtle/30">
              {activeTab === 'all' ? (
                <>
                  {sections.map(
                    (sec) =>
                      sec.items.length > 0 && (
                        <div key={sec.key}>
                          <div className={`px-3 py-1 bg-theme-bg-elevated/40 text-2xs font-mono font-bold uppercase tracking-wider flex items-center justify-between ${sec.badgeColor}`}>
                            <span>{sec.title} ({sec.items.length})</span>
                          </div>
                          <div className="divide-y divide-theme-border-subtle/20">
                            {sec.items.map((item) => (
                              <StagedActionRow
                                key={item.id}
                                item={item}
                                now={now}
                                onSelect={handleSelect}
                                onDiscard={handleDiscard}
                              />
                            ))}
                          </div>
                        </div>
                      )
                  )}
                </>
              ) : displayedActions.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center gap-1 text-theme-text-muted text-xs font-mono">
                  <span>No active {activeTab} staged</span>
                </div>
              ) : (
                displayedActions.map((item) => (
                  <StagedActionRow
                    key={item.id}
                    item={item}
                    now={now}
                    onSelect={handleSelect}
                    onDiscard={handleDiscard}
                  />
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </div>
  );
});

// Backward compatibility alias
export const StagedTradesHeaderPill = StagedActionsDropdown;
export type StagedTradesHeaderPillProps = StagedActionsDropdownProps;
