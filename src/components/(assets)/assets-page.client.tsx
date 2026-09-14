'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AgentLoader } from '@/components/common/agent-loader';
import { useAccountOverview } from '@/hooks';
import { AssetsHeader } from './assets-header';
import { AssetsMetricCards } from './assets-metric-cards';
import { AssetsRiskMeter } from './assets-risk-meter';
import { AssetsTable } from './assets-table';
import { AssetsPositionsSummary } from './assets-positions-summary';
import { AssetsUnconfigured } from './assets-unconfigured';

export function AssetsPageClient() {
  const {
    data,
    isLoading,
    isRefreshing,
    error,
    isMissingConfig,
    lastUpdated,
    refetch,
  } = useAccountOverview();

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
            <AssetsUnconfigured errorMessage={error || undefined} />
          </div>
        )}

        {/* General Error State (when keys configured but exchange rejected) */}
        {!isLoading && !data && !isMissingConfig && error && (
          <div className="min-h-[70vh] flex items-center justify-center">
            <AssetsUnconfigured errorMessage={error} />
          </div>
        )}

        {/* Populated Assets View */}
        {data && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-6"
          >
            {/* Header */}
            <AssetsHeader
              lastUpdated={lastUpdated}
              isLoading={isRefreshing}
              onRefresh={refetch}
            />

            {/* Metric Cards Deck */}
            <AssetsMetricCards
              totalEquity={data.totalEquityUsdt}
              availableEquity={data.effEquityUsdt ?? data.availableEquityUsdt}
              unrealizedPnl={data.unrealizedPnlUsdt}
              marginRatioPercent={data.marginRatioPercent}
              positionValue={data.positionValueUsdt}
            />

            {/* MMR Risk Meter */}
            <AssetsRiskMeter
              marginRatioPercent={data.marginRatioPercent}
              positionMgnRatioPercent={data.positionMgnRatioPercent}
              positionValue={data.positionValueUsdt}
            />

            {/* Active Derivatives Positions (if any) */}
            <AssetsPositionsSummary positions={data.positions || []} />

            {/* Spot Holdings Table */}
            <AssetsTable
              assets={data.assets || []}
              totalEquityUsdt={data.totalEquityUsdt}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
