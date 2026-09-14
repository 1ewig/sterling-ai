'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AgentLoader } from '@/components/common/agent-loader';
import { PortfolioUnconfigured } from '@/components/(portfolio)';
import { useOrdersWorkbench } from '@/hooks/orders/use-orders-workbench';
import { OrdersHeader } from './orders-header';
import { PositionsTable } from './positions-table';
import { OpenOrdersTable } from './open-orders-table';
import { OrdersEmptyState } from './orders-empty-state';

export function OrdersPageClient() {
  const {
    data,
    summary,
    isLoading,
    isWsConnected,
    isActionPending,
    error,
    isMissingConfig,
    cancelOrder,
    cancelSymbolOrders,
    closePosition,
  } = useOrdersWorkbench();

  const hasPositions = (data?.positions?.length || 0) > 0;
  const hasOrders = (data?.orders?.length || 0) > 0;
  const isEmpty = !hasPositions && !hasOrders;

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col overflow-y-auto bg-theme-bg-base select-text">
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Loading Initial State */}
        {isLoading && !data && !isMissingConfig && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <AgentLoader className="size-9 text-theme-brand-primary" />
            <p className="text-xs text-theme-text-secondary animate-pulse">
              Connecting real-time Bitget UTA v3 stream & positions...
            </p>
          </div>
        )}

        {/* Missing API Credentials / Unconfigured State */}
        {isMissingConfig && (
          <div className="min-h-[70vh] flex items-center justify-center">
            <PortfolioUnconfigured errorMessage={error || undefined} />
          </div>
        )}

        {/* General Error State */}
        {!isLoading && !data && !isMissingConfig && error && (
          <div className="min-h-[70vh] flex items-center justify-center">
            <PortfolioUnconfigured errorMessage={error} />
          </div>
        )}

        {/* Populated Orders & Positions View */}
        {data && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-6"
          >
            {/* Header & KPI Summary */}
            <OrdersHeader
              summary={summary}
              isWsConnected={isWsConnected}
            />

            {/* Empty State if no positions and no orders */}
            {isEmpty && <OrdersEmptyState />}

            {/* Active Positions Table */}
            {hasPositions && (
              <PositionsTable
                positions={data.positions}
                isPending={isActionPending}
                onClosePosition={closePosition}
              />
            )}

            {/* Resting & Trigger Plan Orders Table */}
            {hasOrders && (
              <OpenOrdersTable
                orders={data.orders}
                isPending={isActionPending}
                onCancelOrder={cancelOrder}
                onCancelSymbolOrders={cancelSymbolOrders}
              />
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
