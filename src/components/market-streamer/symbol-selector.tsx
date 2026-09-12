'use client';

import React, { useState, useCallback, memo } from 'react';
import { Search } from 'lucide-react';

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
    <div className="px-3.5 py-2.5 border-b border-theme-border-subtle flex flex-col gap-2 shrink-0">
      {/* Search Input with integrated Spot/Futures toggle */}
      <div className="flex items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-theme-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search coin..."
            className="w-full h-7 pl-7 pr-2 bg-theme-bg-surface/60 hover:bg-theme-bg-surface focus:bg-theme-bg-surface rounded-md text-xs font-mono text-theme-text-primary placeholder:text-theme-text-muted border border-theme-border-subtle focus:border-theme-border-strong focus:outline-none transition-colors"
          />
        </form>

        {/* Spot vs Futures Quiet Switcher */}
        <div className="flex items-center p-0.5 rounded-md bg-theme-bg-surface border border-theme-border-subtle text-3xs font-mono shrink-0 select-none">
          <button
            type="button"
            onClick={() => onSelectType('SPOT')}
            className={`px-2 py-1 rounded transition-colors cursor-pointer ${
              currentType === 'SPOT'
                ? 'bg-theme-bg-elevated text-theme-text-primary font-semibold'
                : 'text-theme-text-muted hover:text-theme-text-secondary'
            }`}
          >
            SPOT
          </button>
          <button
            type="button"
            onClick={() => onSelectType('USDT-FUTURES')}
            className={`px-2 py-1 rounded transition-colors cursor-pointer ${
              currentType === 'USDT-FUTURES'
                ? 'bg-theme-bg-elevated text-theme-text-primary font-semibold'
                : 'text-theme-text-muted hover:text-theme-text-secondary'
            }`}
          >
            PERP
          </button>
        </div>
      </div>

      {/* Subtle Asset Pills */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar select-none -mx-0.5">
        {POPULAR_SYMBOLS.map((sym) => {
          const isSelected = cleanCurrentBase === sym;
          return (
            <button
              key={sym}
              type="button"
              onClick={() => onSelectSymbol(sym)}
              className={`px-2 py-0.5 rounded text-2xs font-mono transition-colors cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-theme-bg-elevated text-theme-text-primary font-bold border border-theme-border-subtle'
                  : 'text-theme-text-muted hover:text-theme-text-secondary hover:bg-theme-bg-surface'
              }`}
            >
              {sym}
            </button>
          );
        })}
      </div>
    </div>
  );
});
