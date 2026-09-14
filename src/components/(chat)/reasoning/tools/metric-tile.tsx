'use client';

import React from 'react';

export interface MetricTileProps {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  subValue?: React.ReactNode;
  className?: string;
}

export function MetricTile({
  label,
  value,
  valueColor = 'text-theme-text-primary',
  subValue,
  className = '',
}: MetricTileProps) {
  return (
    <div className={`flex flex-col bg-theme-bg-elevated/40 p-2 rounded ${className}`}>
      <span className="text-theme-text-muted text-2xs uppercase tracking-wider">{label}</span>
      <span className={`font-mono font-bold truncate ${valueColor}`}>{value}</span>
      {subValue && <span className="text-2xs text-theme-text-secondary mt-0.5">{subValue}</span>}
    </div>
  );
}

export interface MetricGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function MetricGrid({ children, columns = 4, className = '' }: MetricGridProps) {
  const colClass =
    columns === 2
      ? 'grid-cols-2'
      : columns === 3
        ? 'grid-cols-2 sm:grid-cols-3'
        : 'grid-cols-2 sm:grid-cols-4';

  return <div className={`grid ${colClass} gap-2 pt-1 ${className}`}>{children}</div>;
}
