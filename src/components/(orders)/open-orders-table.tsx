'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, X, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { tapScalePill } from '@/constants/animation';
import type { BitgetV3OrderInfo } from '@/lib/bitget/types';

export interface OpenOrdersTableProps {
  orders: BitgetV3OrderInfo[];
  isPending: boolean;
  onCancelOrder: (orderId: string, symbol: string, category?: string) => Promise<{ success: boolean; message?: string }>;
  onCancelSymbolOrders: (symbol: string, category?: string) => Promise<{ success: boolean; message?: string }>;
}

export function OpenOrdersTable({
  orders,
  isPending,
  onCancelOrder,
  onCancelSymbolOrders,
}: OpenOrdersTableProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancelSingle = async (order: BitgetV3OrderInfo) => {
    setCancellingId(order.orderId);
    try {
      await onCancelOrder(order.orderId, order.symbol, order.category?.toLowerCase());
    } catch {
      // Handled by hook
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelAllForSymbol = async (symbol: string, category: string) => {
    setCancellingId(`all-${symbol}`);
    try {
      await onCancelSymbolOrders(symbol, category?.toLowerCase());
    } catch {
      // Handled by hook
    } finally {
      setCancellingId(null);
    }
  };

  if (orders.length === 0) {
    return null;
  }

  // Unique symbols for "Cancel All for Symbol" grouping
  const uniqueSymbols = Array.from(new Set(orders.map((o) => o.symbol)));

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-theme-bg-surface border border-theme-border-subtle p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-theme-border-subtle/60 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-theme-text-primary">
            Resting & Trigger Plan Orders
          </h2>
          <span className="text-2xs font-mono font-semibold px-2 py-0.5 rounded-full bg-theme-bg-elevated text-theme-text-secondary border border-theme-border-subtle">
            {orders.length}
          </span>
        </div>

        {/* Quick Cancel All for active symbols */}
        {uniqueSymbols.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-2xs text-theme-text-muted whitespace-nowrap">Cancel All:</span>
            {uniqueSymbols.slice(0, 4).map((sym) => {
              const firstOrder = orders.find((o) => o.symbol === sym);
              return (
                <motion.button
                  key={sym}
                  type="button"
                  whileTap={tapScalePill}
                  onClick={() => firstOrder && handleCancelAllForSymbol(sym, firstOrder.category)}
                  disabled={isPending || cancellingId !== null}
                  className="h-6 px-2 text-2xs font-bold rounded bg-theme-status-error/10 hover:bg-theme-status-error/20 text-theme-status-error border border-theme-status-error/20 flex items-center gap-1 cursor-pointer disabled:opacity-40 select-none whitespace-nowrap"
                  title={`Cancel all open orders for ${sym}`}
                >
                  <Trash2 className="size-2.5" />
                  <span>{sym}</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-theme-border-subtle/80 text-2xs font-semibold text-theme-text-muted uppercase tracking-wider">
              <th className="py-2.5 px-3">Symbol / ID</th>
              <th className="py-2.5 px-3">Type & Side</th>
              <th className="py-2.5 px-3 text-right">Price</th>
              <th className="py-2.5 px-3 text-right">Size / Qty</th>
              <th className="py-2.5 px-3 text-right">Filled</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Time</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border-subtle/40 text-xs">
            {orders.map((o) => {
              const isBuy = o.side === 'buy';
              const sizeNum = parseFloat(o.size || o.amount || '0');
              const execNum = parseFloat(o.cumExecQty || '0');
              const fillPct = sizeNum > 0 ? (execNum / sizeNum) * 100 : 0;
              const priceNum = parseFloat(o.price || '0');
              const timestampNum = o.cTime ? parseInt(o.cTime, 10) : NaN;

              return (
                <tr key={o.orderId || o.clientOid} className="hover:bg-theme-bg-elevated/30 transition-colors">
                  {/* Symbol & Order ID */}
                  <td className="py-3 px-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-theme-text-primary">
                        {o.symbol}
                      </span>
                      <span className="text-3xs font-mono text-theme-text-muted truncate max-w-[120px]">
                        ID: {o.orderId}
                      </span>
                    </div>
                  </td>

                  {/* Type & Side */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-2xs font-bold font-mono uppercase ${
                          isBuy
                            ? 'bg-theme-status-success/10 text-theme-status-success border border-theme-status-success/20'
                            : 'bg-theme-status-error/10 text-theme-status-error border border-theme-status-error/20'
                        }`}
                      >
                        {isBuy ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                        {o.side}
                      </span>
                      <span className="text-2xs font-mono text-theme-text-secondary uppercase">
                        {o.orderType}
                      </span>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-3 px-3 text-right font-mono font-medium text-theme-text-primary">
                    {priceNum > 0 ? `$${priceNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : 'Market'}
                  </td>

                  {/* Size */}
                  <td className="py-3 px-3 text-right font-mono text-theme-text-primary">
                    {sizeNum.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </td>

                  {/* Filled % */}
                  <td className="py-3 px-3 text-right font-mono">
                    <div className="flex flex-col items-end">
                      <span className="text-theme-text-secondary">{fillPct.toFixed(1)}%</span>
                      {execNum > 0 && (
                        <span className="text-3xs text-theme-text-muted">
                          {execNum.toLocaleString()} / {sizeNum.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3">
                    <span className="text-2xs uppercase font-mono px-1.5 py-0.5 rounded bg-theme-bg-elevated text-theme-text-secondary border border-theme-border-subtle/80">
                      {o.status || 'live'}
                    </span>
                  </td>

                  {/* Time */}
                  <td className="py-3 px-3 text-right font-mono text-2xs text-theme-text-muted">
                    {!isNaN(timestampNum) && timestampNum > 0 ? (
                      <span className="flex items-center justify-end gap-1">
                        <Clock className="size-2.5" />
                        {new Date(timestampNum).toLocaleTimeString()}
                      </span>
                    ) : (
                      '--'
                    )}
                  </td>

                  {/* Cancel Button */}
                  <td className="py-3 px-3 text-center">
                    <motion.button
                      type="button"
                      whileTap={tapScalePill}
                      onClick={() => handleCancelSingle(o)}
                      disabled={isPending || cancellingId === o.orderId}
                      className="h-7 px-2.5 text-2xs font-semibold rounded bg-theme-bg-elevated hover:bg-theme-status-error/10 text-theme-text-muted hover:text-theme-status-error border border-theme-border-subtle hover:border-theme-status-error/30 inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 select-none transition-colors"
                      title="Cancel this order"
                    >
                      <X className="size-3" />
                      <span>Cancel</span>
                    </motion.button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
