'use client';

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TrendingUp } from 'lucide-react';
import { useMarketSymbols } from '@/hooks/market';
import { AgentLoader } from '@/components/common';
import type { MarketSymbolRecord } from '@/lib/db';

interface SymbolSearchPopoverProps {
  isOpen: boolean;
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onClose: () => void;
}

const SymbolSearchModalContent = memo(function SymbolSearchModalContent({
  currentSymbol,
  onSelectSymbol,
  onClose,
}: Omit<SymbolSearchPopoverProps, 'isOpen'>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { symbols, isLoading, totalCount } = useMarketSymbols(searchTerm);

  // Auto-focus search input on modal mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current && symbols.length > 0) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, symbols.length]);

  const handleSelect = useCallback(
    (symbol: string) => {
      onSelectSymbol(symbol);
      onClose();
    },
    [onSelectSymbol, onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < symbols.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, symbols.length - 1)));
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

  const formatVol = (v: number) => {
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  };

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
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
        className="fixed inset-x-3 top-20 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[440px] max-h-[480px] bg-theme-bg-surface border border-theme-border-strong/70 rounded-2xl shadow-2xl shadow-black/80 z-50 flex flex-col overflow-hidden select-none"
        onKeyDown={handleKeyDown}
      >
        {/* Header Search Input */}
        <div className="p-3 border-b border-theme-border-subtle flex items-center gap-2.5 bg-theme-bg-base/60">
          <Search className="size-4 text-theme-brand-primary shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search coin or stock (e.g. BTC, SOL, NVDA)..."
            className="flex-1 bg-transparent text-sm font-mono text-theme-text-primary placeholder:text-theme-text-muted focus:outline-none min-w-0"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedIndex(0);
              }}
              className="size-6 rounded flex items-center justify-center text-theme-text-muted hover:text-theme-text-primary transition-colors cursor-pointer shrink-0"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Quick Context Subheader */}
        <div className="px-3.5 py-1.5 bg-theme-bg-elevated/40 border-b border-theme-border-subtle/50 flex items-center justify-between text-3xs font-mono text-theme-text-muted">
          <span className="flex items-center gap-1">
            <TrendingUp className="size-3 text-theme-brand-primary" />
            {searchTerm ? `Matches (${symbols.length})` : `Top Volume (${totalCount} assets)`}
          </span>
          <span>Use ↑ ↓ to navigate, ↵ to select</span>
        </div>

        {/* Symbols List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-0.5 no-scrollbar max-h-[360px]"
        >
          {isLoading && symbols.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-theme-text-muted">
              <AgentLoader className="size-5 text-theme-brand-primary" />
              <span className="text-xs font-mono">Indexing symbols...</span>
            </div>
          ) : symbols.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center gap-1 text-theme-text-muted">
              <span className="text-xs font-mono font-medium text-theme-text-secondary">
                No matching symbol found
              </span>
              <span className="text-3xs font-mono text-theme-text-muted">
                Try searching ticker base (e.g. ETH, DOGE, TSLA)
              </span>
            </div>
          ) : (
            symbols.map((item: MarketSymbolRecord, idx: number) => {
              const isSelected = idx === selectedIndex;
              const isCurrent = item.symbol === currentSymbol;

              return (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => handleSelect(item.symbol)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors text-left cursor-pointer ${
                    isSelected
                      ? 'bg-theme-bg-elevated border border-theme-border-subtle'
                      : 'hover:bg-theme-bg-elevated/50 border border-transparent'
                  }`}
                >
                  {/* Left: Base & Quote + Tags */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-bold font-mono text-theme-text-primary tracking-tight">
                      {item.baseAsset}
                    </span>
                    <span className="text-2xs font-mono text-theme-text-muted">
                      / {item.quoteAsset}
                    </span>

                    {item.hasFutures && (
                      <span className="px-1.5 py-0.2 rounded text-3xs font-mono font-bold uppercase bg-theme-brand-primary/10 text-theme-brand-primary border border-theme-brand-primary/20">
                        PERP
                      </span>
                    )}

                    {isCurrent && (
                      <span className="px-1.5 py-0.2 rounded text-3xs font-mono font-medium text-theme-status-success bg-theme-status-success/10">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Right: Price & 24h Volume */}
                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <span className="text-xs font-bold font-mono text-theme-text-primary">
                      ${formatPrice(item.price)}
                    </span>
                    <span className="text-3xs font-mono text-theme-text-muted">
                      {formatVol(item.volume24h)} vol
                    </span>
                  </div>
                </button>
              );
            })
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
