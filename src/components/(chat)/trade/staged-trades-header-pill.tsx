'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, X, ArrowUpRight, ArrowDownRight, Clock, ChevronRight } from 'lucide-react';
import { useStagedTradesStore } from '@/stores/staged-trades-store';
import { tapScalePill, dropdownMenuVariants } from '@/constants/animation';

export const StagedTradesHeaderPill = React.memo(function StagedTradesHeaderPill() {
  const stagedTrades = useStagedTradesStore((s) => s.stagedTrades);
  const hasHydrated = useStagedTradesStore((s) => s._hasHydrated);
  const openPopup = useStagedTradesStore((s) => s.openPopup);
  const discardTrade = useStagedTradesStore((s) => s.discardTrade);

  const [isOpen, setIsOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const containerRef = useRef<HTMLDivElement>(null);

  // Active trades are those still pending confirmation or executing
  const activeTrades = stagedTrades.filter(
    (t) => (t.status === 'staged' || t.status === 'executing') && (t.expiresAt ? t.expiresAt > now : true)
  );

  // Update clock every second while dropdown is open
  useEffect(() => {
    if (!isOpen || activeTrades.length === 0) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, activeTrades.length]);

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

  const handleSelectTrade = useCallback(
    (id: string) => {
      openPopup(id);
      setIsOpen(false);
    },
    [openPopup]
  );

  const handleDiscard = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      discardTrade(id);
      if (activeTrades.length <= 1) {
        setIsOpen(false);
      }
    },
    [discardTrade, activeTrades.length]
  );

  if (!hasHydrated || activeTrades.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* Header Pill Button */}
      <motion.button
        type="button"
        whileTap={tapScalePill}
        onClick={() => setIsOpen((prev) => !prev)}
        title={`${activeTrades.length} staged trade order${activeTrades.length > 1 ? 's' : ''} awaiting confirmation`}
        aria-label="Staged Trades Drawer"
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
          Staged <span className="text-theme-brand-accent">({activeTrades.length})</span>
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
            className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 rounded-xl bg-theme-bg-surface border border-theme-border-subtle shadow-2xl overflow-hidden z-40 flex flex-col"
          >
            {/* Menu Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-theme-border-subtle/50 bg-theme-bg-elevated/30">
              <div className="flex items-center gap-1.5">
                <Layers className="size-3.5 text-theme-brand-accent" />
                <span className="text-2xs font-bold uppercase tracking-wider text-theme-text-primary">
                  Staged Orders ({activeTrades.length})
                </span>
              </div>
              <span className="text-2xs text-theme-text-muted">Click to view ticket</span>
            </div>

            {/* List of Trades */}
            <div className="flex flex-col max-h-64 overflow-y-auto divide-y divide-theme-border-subtle/30">
              {activeTrades.map((trade) => {
                const isBuy = trade.side === 'buy';
                const remainingSec = Math.max(
                  0,
                  Math.floor((trade.expiresAt - now) / 1000)
                );
                const min = Math.floor(remainingSec / 60);
                const sec = remainingSec % 60;
                const isExpired = remainingSec <= 0;

                return (
                  <div
                    key={trade.id}
                    onClick={() => handleSelectTrade(trade.id)}
                    className="p-2.5 hover:bg-theme-bg-elevated/50 transition-colors cursor-pointer flex items-center justify-between gap-2 text-xs group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`size-6 rounded flex items-center justify-center font-mono font-bold text-2xs uppercase shrink-0 border ${
                          isBuy
                            ? 'bg-theme-status-success/15 text-theme-status-success border-theme-status-success/30'
                            : 'bg-theme-status-danger/15 text-theme-status-danger border-theme-status-danger/30'
                        }`}
                      >
                        {isBuy ? (
                          <ArrowUpRight className="size-3.5" />
                        ) : (
                          <ArrowDownRight className="size-3.5" />
                        )}
                      </span>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-theme-text-primary truncate">
                            {trade.symbol}
                          </span>
                          <span className="font-mono text-2xs text-theme-text-muted uppercase">
                            {trade.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-2xs text-theme-text-secondary">
                          <span>Qty: {trade.size}</span>
                          <span>•</span>
                          <span>${trade.price?.toLocaleString()}</span>
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
                        onClick={(e) => handleDiscard(e, trade.id)}
                        title="Discard this order"
                        className="size-6 rounded flex items-center justify-center text-theme-text-muted hover:text-theme-status-danger hover:bg-theme-status-danger/10 transition-colors cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>

                      <ChevronRight className="size-3.5 text-theme-text-muted group-hover:text-theme-text-primary transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
