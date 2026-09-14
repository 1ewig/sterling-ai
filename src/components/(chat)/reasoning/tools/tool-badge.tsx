'use client';

import React from 'react';

export interface SideBadgeProps {
  side?: 'buy' | 'sell' | 'long' | 'short' | 'net' | string;
  size?: 'sm' | 'md';
  label?: string;
}

export function SideBadge({ side, size = 'sm', label }: SideBadgeProps) {
  const isPositive = side === 'buy' || side === 'long';
  const displayLabel = label || (side ? (isPositive ? 'BUY / LONG' : 'SELL / SHORT') : 'NEUTRAL');
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-2xs' : 'px-2 py-1 text-xs';

  return (
    <span
      className={`rounded font-mono font-bold uppercase border ${sizeClass} ${
        isPositive
          ? 'bg-theme-status-success/15 text-theme-status-success border-theme-status-success/30'
          : 'bg-theme-status-danger/15 text-theme-status-danger border-theme-status-danger/30'
      }`}
    >
      {displayLabel}
    </span>
  );
}

export interface CategoryBadgeProps {
  category?: string;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ category = 'USDT-FUTURES', size = 'sm' }: CategoryBadgeProps) {
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-2xs' : 'px-2 py-1 text-xs';
  return (
    <span className={`rounded bg-theme-bg-elevated text-theme-text-muted font-mono uppercase ${sizeClass}`}>
      {category}
    </span>
  );
}
