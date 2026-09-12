'use client';

import React, { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TrendingUp } from 'lucide-react';
import { useMarketSymbols } from '@/hooks/market';
import { AgentLoader } from '@/components/common';
import type { MarketSymbolRecord } from '@/lib/db';
import { formatMarketPrice, formatMarketVolume } from '@/lib/bitget';

interface SymbolSearchPopoverProps {
  isOpen: boolean;
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onClose: () => void;
}

const INITIAL_BATCH_SIZE = 40;
const BATCH_INCREMENT = 40;

const SymbolSearchModalContent = memo(function SymbolSearchModalContent({
  currentSymbol,
  onSelectSymbol,
  onClose,
}: Omit<SymbolSearchPopoverProps, 'isOpen'>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { symbols, isLoading, isSyncing, totalCount } = useMarketSymbols(searchTerm, { enabled: true });

  // Sliced batch for smooth progressive DOM rendering
  const visibleSymbols = useMemo(() => {
    return symbols.slice(0, visibleCount);
  }, [symbols, visibleCount]);

  // Auto-focus search input on modal mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // IntersectionObserver to seamlessly load more pairs when nearing bottom
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => (prev < symbols.length ? prev + BATCH_INCREMENT : prev));
        }
      },
      { root: listRef.current, rootMargin: '120px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleSymbols.length, symbols.length]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current && visibleSymbols.length > 0) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, visibleSymbols.length]);

  const handleSelect = useCallback(
    (symbol: string) => {
      onSelectSymbol(symbol);
      onClose();
    },
    [onSelectSymbol, onClose]
  );

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollHeight - scrollTop - clientHeight < 150) {
        setVisibleCount((prev) => (prev < symbols.length ? prev + BATCH_INCREMENT : prev));
      }
    },
    [symbols.length]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = prev < symbols.length - 1 ? prev + 1 : 0;
        if (next >= visibleCount - 4 && visibleCount < symbols.length) {
          setVisibleCount((count) => Math.min(symbols.length, count + BATCH_INCREMENT));
        }
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        if (prev > 0) return prev - 1;
        setVisibleCount(symbols.length);
        return Math.max(0, symbols.length - 1);
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (symbols[selectedIndex]) {
        handleSelect(symbols[selectedIndex].symbol);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="popover-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 bg-theme-bg-overlay/60 backdrop-blur-xs z-50"
        aria-hidden="true"
      />

      {/* Floating Search Modal */}
      <motion.div
        key="popover-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Search Market Symbol"
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-3 top-16 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[400px] max-h-[440px] bg-theme-bg-surface border border-theme-border-strong/70 rounded-xl shadow-2xl shadow-black/80 z-50 flex flex-col overflow-hidden select-none"
        onKeyDown={handleKeyDown}
      >
        {/* Header Search Input */}
        <div className="px-3 py-2 border-b border-theme-border-subtle flex items-center gap-2 bg-theme-bg-base/70">
          {isSyncing || (isLoading && symbols.length === 0) ? (
            <AgentLoader className="size-3.5 text-theme-brand-primary shrink-0 ml-0.5" />
          ) : (
            <Search className="size-3.5 text-theme-brand-primary shrink-0 ml-0.5" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setVisibleCount(INITIAL_BATCH_SIZE);
              setSelectedIndex(0);
            }}
            placeholder="Search coin or stock (e.g. BTC, SOL, NVDA)..."
            className="flex-1 bg-transparent text-xs font-mono text-theme-text-primary placeholder:text-theme-text-muted focus:outline-none min-w-0"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setVisibleCount(INITIAL_BATCH_SIZE);
                setSelectedIndex(0);
              }}
              className="size-5 rounded flex items-center justify-center text-theme-text-muted hover:text-theme-text-primary transition-colors cursor-pointer shrink-0"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Quick Context Subheader */}
        <div className="px-3 py-1 bg-theme-bg-elevated/30 border-b border-theme-border-subtle/40 flex items-center justify-between text-2xs font-mono text-theme-text-muted">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-1.5 truncate">
              <TrendingUp className="size-3 text-theme-brand-primary shrink-0" />
              {searchTerm ? (
                <span>
                  {visibleSymbols.length < symbols.length
                    ? `${visibleSymbols.length} of ${symbols.length} matches`
                    : `${symbols.length} matches`}
                </span>
              ) : (
                <span>
                  {visibleSymbols.length < totalCount
                    ? `${visibleSymbols.length} of ${totalCount} pairs`
                    : `All ${totalCount} pairs`}
                </span>
              )}
            </span>
            {isSyncing && symbols.length > 0 && (
              <span className="inline-flex items-center gap-1 text-2xs font-mono text-theme-brand-primary bg-theme-brand-primary/10 px-1.5 py-0.5 rounded border border-theme-brand-primary/20 animate-pulse shrink-0">
                <span className="size-1 rounded-full bg-theme-brand-primary" />
                Syncing live
              </span>
            )}
          </div>
          <span className="text-theme-text-muted/70 shrink-0">↑↓ Navigate • ↵ Select</span>
        </div>

        {/* Symbols List */}
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-1 flex flex-col gap-px no-scrollbar max-h-[340px]"
        >
          {isLoading && symbols.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-theme-text-muted">
              <AgentLoader className="size-5 text-theme-brand-primary" />
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-xs font-mono font-medium text-theme-text-primary">
                  Fetching live symbols...
                </span>
                <span className="text-2xs font-mono text-theme-text-muted px-4">
                  Indexing 2,000+ crypto & tokenized US equity pairs from Bitget V3
                </span>
              </div>
            </div>
          ) : symbols.length === 0 ? (
            <div className="py-7 flex flex-col items-center justify-center gap-0.5 text-theme-text-muted">
              <span className="text-xs font-mono font-medium text-theme-text-secondary">
                No matching symbol
              </span>
              <span className="text-2xs font-mono text-theme-text-muted">
                Try searching ticker base (e.g. ETH, SOL, TSLA)
              </span>
            </div>
          ) : (
            <>
              {visibleSymbols.map((item: MarketSymbolRecord, idx: number) => {
                const isSelected = idx === selectedIndex;
                const isCurrent = item.symbol === currentSymbol;

                return (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => handleSelect(item.symbol)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-theme-bg-elevated border border-theme-border-subtle'
                        : 'hover:bg-theme-bg-elevated/40 border border-transparent'
                    }`}
                  >
                    {/* Left: Base & Quote + Tags */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold font-mono text-theme-text-primary tracking-tight">
                        {item.baseAsset}
                      </span>
                      <span className="text-2xs font-mono text-theme-text-secondary">
                        /{item.quoteAsset}
                      </span>

                      {item.hasSpot !== false && (
                        <span className="px-1 py-0.5 rounded text-2xs font-mono font-bold uppercase leading-none bg-theme-bg-elevated text-theme-text-secondary border border-theme-border-subtle">
                          SPOT
                        </span>
                      )}

                      {item.hasFutures && (
                        <span className="px-1 py-0.5 rounded text-2xs font-mono font-bold uppercase leading-none bg-theme-brand-primary/10 text-theme-brand-primary border border-theme-brand-primary/20" title="Perpetual futures metrics available">
                          PERP
                        </span>
                      )}

                      {isCurrent && (
                        <span className="px-1 py-0.5 rounded text-2xs font-mono font-medium uppercase leading-none text-theme-status-success bg-theme-status-success/10 border border-theme-status-success/20">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Right: Price & 24h Volume */}
                    <div className="flex flex-col items-end shrink-0 pl-2 text-right">
                      <span className="text-xs font-semibold font-mono tabular-nums text-theme-text-primary leading-tight">
                        ${formatMarketPrice(item.price)}
                      </span>
                      <span className="text-2xs font-mono tabular-nums text-theme-text-muted/70 leading-tight">
                        {formatMarketVolume(item.volume24h)}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* Lazy Loading Sentinel */}
              {visibleSymbols.length < symbols.length && (
                <div
                  ref={sentinelRef}
                  className="py-2 flex items-center justify-center gap-1.5 text-2xs font-mono text-theme-text-muted"
                >
                  <span className="size-1.5 rounded-full bg-theme-brand-primary animate-pulse" />
                  <span>Loading more pairs ({visibleSymbols.length}/{symbols.length})...</span>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </>
  );
});

export const SymbolSearchPopover = memo(function SymbolSearchPopover({
  isOpen,
  currentSymbol,
  onSelectSymbol,
  onClose,
}: SymbolSearchPopoverProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <SymbolSearchModalContent
          currentSymbol={currentSymbol}
          onSelectSymbol={onSelectSymbol}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
});
