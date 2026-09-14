'use client';

import React, { memo } from 'react';

export const PortfolioHeader = memo(function PortfolioHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-theme-border-subtle pb-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-black text-theme-text-primary tracking-tight">
          Portfolio & Balances Desk
        </h1>
        <p className="text-xs text-theme-text-secondary">
          Real-time Unified Trading Account balances, cross-margin collateral capacity, and spot asset holdings.
        </p>
      </div>
    </div>
  );
});
