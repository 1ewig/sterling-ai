'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronRight,
  Ban,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { useStagedActions, type StagedTradeItem } from '@/hooks/chat';
import { tapScalePill, dropdownMenuVariants } from '@/constants/animation';

type StagedTab = 'all' | 'orders' | 'cancels' | 'closes';

interface StagedActionRowProps {
  item: StagedTradeItem;
  now: number;
  onSelect: (id: string) => void;
  onDiscard: (e: React.MouseEvent, id: string) => void;
}

const StagedActionRow = React.memo(function StagedActionRow({
  item,
  now,
  onSelect,
  onDiscard,
}: StagedActionRowProps) {
  const actionType = item.actionType || 'order';
  const isBuy = item.side === 'buy';
  const remainingSec = Math.max(0, Math.floor((item.expiresAt - now) / 1000));
  const min = Math.floor(remainingSec / 60);
  const sec = remainingSec % 60;
  const isExpired = remainingSec <= 0;

  return (
    <div
      onClick={() => onSelect(item.id)}
      className="p-2.5 hover:bg-theme-bg-elevated/50 transition-colors cursor-pointer flex items-center justify-between gap-2 text-xs group"
    >
      <div className="flex items-center gap-2 min-w-0">
        {actionType === 'order' ? (
          <span
            className={`size-6 rounded flex items-center justify-center font-mono font-bold text-2xs uppercase shrink-0 border ${
              isBuy
                ? 'bg-theme-status-success/15 text-theme-status-success border-theme-status-success/30'
                : 'bg-theme-status-danger/15 text-theme-status-danger border-theme-status-danger/30'
            }`}
          >
            {isBuy ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
          </span>
        ) : actionType === 'cancel' ? (
          <span className="size-6 rounded flex items-center justify-center font-mono font-bold text-2xs uppercase shrink-0 border bg-theme-status-warning/15 text-theme-status-warning border-theme-status-warning/30">
            <Ban className="size-3.5" />
          </span>
        ) : (
          <span className="size-6 rounded flex items-center justify-center font-mono font-bold text-2xs uppercase shrink-0 border bg-theme-status-danger/15 text-theme-status-danger border-theme-status-danger/30">
            <ShieldAlert className="size-3.5" />
          </span>
        )}

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-theme-text-primary truncate">
              {item.symbol}
            </span>
            <span className="font-mono text-2xs text-theme-text-muted uppercase">
              {item.category}
            </span>
            {actionType === 'cancel' ? (
              <span className="px-1 py-0.5 rounded text-2xs font-mono font-bold uppercase bg-theme-status-warning/10 text-theme-status-warning border border-theme-status-warning/20">
                CANCEL
              </span>
            ) : actionType === 'close' ? (
              <span className="px-1 py-0.5 rounded text-2xs font-mono font-bold uppercase bg-theme-status-danger/10 text-theme-status-danger border border-theme-status-danger/20">
                EXIT {item.sizePercent || 100}%
              </span>
            ) : (
              <span
                className={`px-1 py-0.5 rounded text-2xs font-mono font-bold uppercase ${
                  isBuy
                    ? 'bg-theme-status-success/10 text-theme-status-success border border-theme-status-success/20'
                    : 'bg-theme-status-danger/10 text-theme-status-danger border border-theme-status-danger/20'
                }`}
              >
                {isBuy ? 'BUY' : 'SELL'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 font-mono text-2xs text-theme-text-secondary truncate">
            {actionType === 'order' ? (
              <>
                <span>Qty: {item.size}</span>
                <span>•</span>
                <span>${item.price?.toLocaleString() || 'Market'}</span>
              </>
            ) : actionType === 'cancel' ? (
              <span>
                {item.cancelAll
                  ? 'All Working Orders'
                  : `Order #${(item.orderId || item.clientOid || '').substring(0, 8)}`}
              </span>
            ) : (
              <span>
                {item.closeSide === 'buy' ? 'Close Short' : 'Close Long'} (
                {item.closeSize ? `${item.closeSize} units` : `${item.sizePercent || 100}%`})
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center gap-1 text-2xs font-mono text-theme-text-muted">
          <Clock className="size-3" />
          <span>{isExpired ? 'Exp' : `${min}m ${sec}s`}</span>
        </div>

        <button
          type="button"
          onClick={(e) => onDiscard(e, item.id)}
          title="Discard this action"
          className="size-6 rounded flex items-center justify-center text-theme-text-muted hover:text-theme-status-danger hover:bg-theme-status-danger/10 transition-colors cursor-pointer"
        >
          <X className="size-3" />
        </button>

        <ChevronRight className="size-3.5 text-theme-text-muted group-hover:text-theme-text-primary transition-colors" />
      </div>
    </div>
  );
});

export const StagedTradesHeaderPill = React.memo(function StagedTradesHeaderPill() {
  const {
    activeActions,
    orders,
    cancels,
    closes,
    counts,
    hasHydrated,
    now,
    openPopup,
    discardAction,
  } = useStagedActions();

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

  const handleSelectAction = useCallback(
    (id: string) => {
      openPopup(id);
      setIsOpen(false);
    },
    [openPopup]
  );

  const handleDiscard = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      discardAction(id);
      if (counts.total <= 1) {
        setIsOpen(false);
      }
    },
    [discardAction, counts.total]
  );

  if (!hasHydrated || counts.total === 0) {
    return null;
  }

  // Determine which actions to render based on the active tab
  const displayedActions =
    activeTab === 'orders'
      ? orders
      : activeTab === 'cancels'
        ? cancels
        : activeTab === 'closes'
          ? closes
          : activeActions;

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* Header Pill Button */}
      <motion.button
        type="button"
        whileTap={tapScalePill}
        onClick={() => setIsOpen((prev) => !prev)}
        title={`${counts.total} staged action${counts.total > 1 ? 's' : ''} awaiting confirmation`}
        aria-label="Staged Actions Drawer"
        aria-expanded={isOpen}
        className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 select-none transition-all cursor-pointer border shadow-2xs ${
          isOpen
            ? 'bg-theme-brand-accent/20 text-theme-brand-accent border-theme-brand-accent/40'
            : 'bg-theme-bg-surface hover:bg-theme-bg-elevated text-theme-text-primary border-theme-border-subtle'
        }`}
      >
        <span className="relative flex size-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-brand-accent opacity-75" />
          <span className="relative inline-flex rounded-full size-2 bg-theme-brand-accent" />
        </span>
        <Layers className="size-3.5 text-theme-brand-accent" />
        <span className="font-bold text-theme-text-primary">
          Staged <span className="text-theme-brand-accent">({counts.total})</span>
        </span>
      </motion.button>

      {/* Overflow Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownMenuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 rounded-xl bg-theme-bg-surface border border-theme-border-subtle shadow-2xl overflow-hidden z-40 flex flex-col"
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
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex-1 py-1 px-2 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-theme-bg-elevated text-theme-text-primary font-bold border border-theme-border-subtle'
                    : 'text-theme-text-muted hover:text-theme-text-primary'
                }`}
              >
                <span>All</span>
                <span className="text-2xs opacity-80">({counts.total})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`flex-1 py-1 px-2 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-theme-bg-elevated text-theme-text-primary font-bold border border-theme-border-subtle'
                    : 'text-theme-text-muted hover:text-theme-text-primary'
                }`}
              >
                <TrendingUp className="size-3 text-theme-status-success" />
                <span>Orders</span>
                <span className="text-2xs opacity-80">({counts.orders})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cancels')}
                className={`flex-1 py-1 px-2 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'cancels'
                    ? 'bg-theme-bg-elevated text-theme-text-primary font-bold border border-theme-border-subtle'
                    : 'text-theme-text-muted hover:text-theme-text-primary'
                }`}
              >
                <Ban className="size-3 text-theme-status-warning" />
                <span>Cancels</span>
                <span className="text-2xs opacity-80">({counts.cancels})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('closes')}
                className={`flex-1 py-1 px-2 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'closes'
                    ? 'bg-theme-bg-elevated text-theme-text-primary font-bold border border-theme-border-subtle'
                    : 'text-theme-text-muted hover:text-theme-text-primary'
                }`}
              >
                <ShieldAlert className="size-3 text-theme-status-danger" />
                <span>Exits</span>
                <span className="text-2xs opacity-80">({counts.closes})</span>
              </button>
            </div>

            {/* List of Separated Staged Actions */}
            <div className="flex flex-col max-h-72 overflow-y-auto divide-y divide-theme-border-subtle/30">
              {activeTab === 'all' ? (
                <>
                  {orders.length > 0 && (
                    <div>
                      <div className="px-3 py-1 bg-theme-bg-elevated/40 text-2xs font-mono font-bold uppercase text-theme-text-muted tracking-wider flex items-center justify-between">
                        <span>Trade Orders ({orders.length})</span>
                      </div>
                      <div className="divide-y divide-theme-border-subtle/20">
                        {orders.map((item) => (
                          <StagedActionRow
                            key={item.id}
                            item={item}
                            now={now}
                            onSelect={handleSelectAction}
                            onDiscard={handleDiscard}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {cancels.length > 0 && (
                    <div>
                      <div className="px-3 py-1 bg-theme-bg-elevated/40 text-2xs font-mono font-bold uppercase text-theme-status-warning tracking-wider flex items-center justify-between">
                        <span>Order Cancellations ({cancels.length})</span>
                      </div>
                      <div className="divide-y divide-theme-border-subtle/20">
                        {cancels.map((item) => (
                          <StagedActionRow
                            key={item.id}
                            item={item}
                            now={now}
                            onSelect={handleSelectAction}
                            onDiscard={handleDiscard}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {closes.length > 0 && (
                    <div>
                      <div className="px-3 py-1 bg-theme-bg-elevated/40 text-2xs font-mono font-bold uppercase text-theme-status-danger tracking-wider flex items-center justify-between">
                        <span>Position Exits ({closes.length})</span>
                      </div>
                      <div className="divide-y divide-theme-border-subtle/20">
                        {closes.map((item) => (
                          <StagedActionRow
                            key={item.id}
                            item={item}
                            now={now}
                            onSelect={handleSelectAction}
                            onDiscard={handleDiscard}
                          />
                        ))}
                      </div>
                    </div>
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
                    onSelect={handleSelectAction}
                    onDiscard={handleDiscard}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
