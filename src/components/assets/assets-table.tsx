'use client';

import React, { memo, useState, useMemo } from 'react';
import { Search, Coins, ArrowUpDown } from 'lucide-react';
import type { BitgetAssetBalance } from '@/lib/bitget/types';

export interface AssetsTableProps {
  assets: BitgetAssetBalance[];
  totalEquityUsdt: number;
}

export const AssetsTable = memo(function AssetsTable({
  assets,
  totalEquityUsdt,
}: AssetsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hideZeroBalances, setHideZeroBalances] = useState(true);
  const [sortField, setSortField] = useState<'coin' | 'balance' | 'usdValue'>('usdValue');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredAndSortedAssets = useMemo(() => {
    let list = [...assets];

    if (hideZeroBalances) {
      list = list.filter((a) => a.balance > 0 || a.locked > 0 || a.usdValue > 0.01);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((a) => a.coin.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'coin') {
        comparison = a.coin.localeCompare(b.coin);
      } else if (sortField === 'balance') {
        comparison = a.balance - b.balance;
      } else {
        comparison = a.usdValue - b.usdValue;
      }
      return sortAsc ? comparison : -comparison;
    });

    return list;
  }, [assets, hideZeroBalances, searchQuery, sortField, sortAsc]);

  const handleSort = (field: 'coin' | 'balance' | 'usdValue') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="rounded-2xl bg-theme-bg-surface border border-theme-border-subtle shadow-xs overflow-hidden flex flex-col">
      {/* Table Header Controls */}
      <div className="p-spacing-md border-b border-theme-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Coins className="size-4 text-theme-brand-primary" />
          <h2 className="text-sm font-bold text-theme-text-primary tracking-tight">
            Spot & Collateral Holdings
          </h2>
          <span className="text-2xs font-mono px-2 py-0.5 rounded-full bg-theme-bg-elevated border border-theme-border-subtle text-theme-text-muted">
            {filteredAndSortedAssets.length} assets
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-48">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" />
            <input
              type="text"
              placeholder="Filter coin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-xl bg-theme-bg-elevated border border-theme-border-subtle text-theme-text-primary placeholder:text-theme-text-muted focus:outline-none focus:border-theme-brand-primary transition-colors"
            />
          </div>

          {/* Hide Zero Balances Toggle */}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-2xs text-theme-text-secondary hover:text-theme-text-primary transition-colors">
            <input
              type="checkbox"
              checked={hideZeroBalances}
              onChange={(e) => setHideZeroBalances(e.target.checked)}
              className="size-3.5 rounded bg-theme-bg-elevated border-theme-border-strong text-theme-brand-primary focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Hide 0 balances</span>
          </label>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-theme-border-subtle bg-theme-bg-elevated/40 text-2xs font-bold uppercase tracking-wider text-theme-text-secondary">
              <th
                onClick={() => handleSort('coin')}
                className="py-3 px-4 cursor-pointer hover:text-theme-text-primary transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Asset</span>
                  <ArrowUpDown className="size-3 text-theme-text-muted" />
                </div>
              </th>
              <th
                onClick={() => handleSort('balance')}
                className="py-3 px-4 text-right cursor-pointer hover:text-theme-text-primary transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total Balance</span>
                  <ArrowUpDown className="size-3 text-theme-text-muted" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Available</th>
              <th className="py-3 px-4 text-right">In Orders / Locked</th>
              <th
                onClick={() => handleSort('usdValue')}
                className="py-3 px-4 text-right cursor-pointer hover:text-theme-text-primary transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>USD Value</span>
                  <ArrowUpDown className="size-3 text-theme-text-muted" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Allocation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border-subtle">
            {filteredAndSortedAssets.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-theme-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Coins className="size-8 text-theme-text-muted/40 stroke-[1.5]" />
                    <p className="text-xs">No assets match your search or filter criteria.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSortedAssets.map((asset) => {
                const allocationPct =
                  totalEquityUsdt > 0 && asset.usdValue > 0
                    ? Math.min((asset.usdValue / totalEquityUsdt) * 100, 100)
                    : 0;

                return (
                  <tr
                    key={asset.coin}
                    className="hover:bg-theme-bg-elevated/40 transition-colors"
                  >
                    {/* Coin Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-full bg-theme-bg-elevated border border-theme-border-subtle flex items-center justify-center font-bold text-2xs text-theme-brand-primary">
                          {asset.coin.slice(0, 3)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-theme-text-primary tracking-tight">
                            {asset.coin}
                          </span>
                          <span className="text-2xs text-theme-text-muted">
                            Spot / Collateral
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Total Balance */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-theme-text-primary">
                      {asset.balance.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                    </td>

                    {/* Available */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-theme-text-secondary">
                      {asset.available.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                    </td>

                    {/* Locked / In Order */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-theme-text-muted">
                      {asset.locked > 0
                        ? asset.locked.toLocaleString('en-US', { maximumFractionDigits: 6 })
                        : '—'}
                    </td>

                    {/* USD Value */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-semibold text-theme-text-primary">
                      ${asset.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Allocation % */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-theme-bg-elevated overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-theme-brand-primary rounded-full"
                            style={{ width: `${allocationPct}%` }}
                          />
                        </div>
                        <span className="font-mono text-2xs text-theme-text-muted w-10 text-right">
                          {allocationPct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});
