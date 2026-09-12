'use client';

import React, { useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { tapScalePill } from '@/constants/animation';

interface SymbolSelectorProps {
  currentSymbol: string;
  currentType: 'SPOT' | 'USDT-FUTURES';
  onSelectSymbol: (symbol: string) => void;
  onSelectType: (type: 'SPOT' | 'USDT-FUTURES') => void;
}

const POPULAR_SYMBOLS = [
  'BTC',
  'ETH',
  'SOL',
  'DOGE',
  'TSLA',
  'NVDA',
  'SPY',
] as const;

export const SymbolSelector = memo(function SymbolSelector({
  currentSymbol,
  currentType,
  onSelectSymbol,
  onSelectType,
}: SymbolSelectorProps) {
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const clean = searchInput.trim().toUpperCase();
      if (clean) {
        onSelectSymbol(clean);
        setSearchInput('');
      }
    },
    [searchInput, onSelectSymbol]
  );

  const cleanCurrentBase = currentSymbol.replace(/USDT$|USD$|USDC$/, '');

  return (
    <div className="p-3 border-b border-theme-border-subtle flex flex-col gap-2.5 shrink-0 bg-theme-bg-base/30">
      {/* Product Type Segmented Switcher */}
      <div className="grid grid-cols-2 p-0.5 rounded-lg bg-theme-bg-surface border border-theme-border-subtle text-xs font-semibold select-none">
        <button
          type="button"
          onClick={() => onSelectType('SPOT')}
          className={`py-1 rounded-md transition-all cursor-pointer text-center ${
            currentType === 'SPOT'
              ? 'bg-theme-bg-elevated text-theme-text-primary shadow-2xs font-bold'
              : 'text-theme-text-muted hover:text-theme-text-secondary'
          }`}
        >
          Spot Market
        </button>
        <button
          type="button"
          onClick={() => onSelectType('USDT-FUTURES')}
          className={`py-1 rounded-md transition-all cursor-pointer text-center ${
            currentType === 'USDT-FUTURES'
              ? 'bg-theme-bg-elevated text-theme-text-primary shadow-2xs font-bold'
              : 'text-theme-text-muted hover:text-theme-text-secondary'
          }`}
        >
          USDT-M Futures
        </button>
      </div>

      {/* Quick Select Asset Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 select-none">
        {POPULAR_SYMBOLS.map((sym) => {
          const isSelected = cleanCurrentBase === sym;
          return (
            <motion.button
              key={sym}
              type="button"
              whileTap={tapScalePill}
              onClick={() => onSelectSymbol(sym)}
              className={`px-2 py-1 rounded-lg text-2xs font-mono font-bold shrink-0 transition-colors cursor-pointer border ${
                isSelected
                  ? 'bg-theme-brand-primary/15 text-theme-brand-primary border-theme-brand-primary/30 shadow-2xs'
                  : 'bg-theme-bg-surface text-theme-text-secondary hover:text-theme-text-primary border-theme-border-subtle hover:border-theme-border-strong'
              }`}
            >
              {sym}
            </motion.button>
          );
        })}
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="relative flex items-center">
        <Search className="absolute left-2.5 size-3.5 text-theme-text-muted pointer-events-none" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search pair (e.g. SUI, MSTR, XRP)..."
          className="w-full h-8 pl-8 pr-3 bg-theme-bg-surface hover:bg-theme-bg-elevated/40 focus:bg-theme-bg-surface rounded-lg text-xs font-mono text-theme-text-primary placeholder:text-theme-text-muted border border-theme-border-subtle focus:border-theme-brand-primary/50 focus:outline-none transition-colors"
        />
      </form>
    </div>
  );
});
