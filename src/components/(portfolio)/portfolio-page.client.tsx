'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { pageEntranceVariants } from '@/constants/animation';
import { AgentLoader } from '@/components/common/agent-loader';
import { usePortfolioOverview } from '@/hooks';
import { PortfolioHeader } from './portfolio-header';
import { PortfolioMetricCards } from './portfolio-metric-cards';
import { PortfolioRiskMeter } from './portfolio-risk-meter';
import { PortfolioTable } from './portfolio-table';
import { PortfolioPositionsSummary } from './portfolio-positions-summary';
import { PortfolioUnconfigured } from './portfolio-unconfigured';

export function PortfolioPageClient() {
  const {
    data,
    isLoading,
    error,
    isMissingConfig,
  } = usePortfolioOverview();

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col overflow-y-auto bg-theme-bg-base select-text">
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Loading Initial State */}
        {isLoading && !data && !isMissingConfig && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <AgentLoader className="size-9 text-theme-brand-primary" />
            <p className="text-xs text-theme-text-secondary animate-pulse">
              Querying Bitget UTA v3 account assets & positions...
            </p>
          </div>
        )}

        {/* Missing API Credentials / Unconfigured State */}
        {isMissingConfig && (
          <div className="min-h-[70vh] flex items-center justify-center">
            <PortfolioUnconfigured errorMessage={error || undefined} />
          </div>
        )}

        {/* General Error State (when keys configured but exchange rejected) */}
        {!isLoading && !data && !isMissingConfig && error && (
          <div className="min-h-[70vh] flex items-center justify-center">
            <PortfolioUnconfigured errorMessage={error} />
          </div>
        )}

        {/* Populated Portfolio View */}
        {data && (
          <motion.div
            variants={pageEntranceVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-6"
          >
            {/* Header */}
            <PortfolioHeader />

            {/* Metric Cards Deck */}
            <PortfolioMetricCards
              totalEquity={data.totalEquityUsdt}
              availableEquity={data.effEquityUsdt ?? data.availableEquityUsdt}
              unrealizedPnl={data.unrealizedPnlUsdt}
              marginRatioPercent={data.marginRatioPercent}
              positionValue={data.positionValueUsdt}
            />

            {/* MMR Risk Meter */}
            <PortfolioRiskMeter
              marginRatioPercent={data.marginRatioPercent}
              positionMgnRatioPercent={data.positionMgnRatioPercent}
              positionValue={data.positionValueUsdt}
            />

            {/* Active Derivatives Positions (if any) */}
            <PortfolioPositionsSummary positions={data.positions || []} />

            {/* Spot Holdings Table */}
            <PortfolioTable
              assets={data.assets || []}
              totalEquityUsdt={data.totalEquityUsdt}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}

export const AssetsPageClient = PortfolioPageClient;
