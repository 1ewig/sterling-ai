'use client';

import React, { useState } from 'react';
import { ListFilter, XCircle, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface OpenOrderItem {
  orderId: string;
  clientOid?: string;
  symbol: string;
  side: 'buy' | 'sell';
  orderType: string;
  price?: string;
  size: string;
  status: string;
  cumExecQty?: string;
  cTime?: string;
}

interface OpenOrdersData {
  symbol?: string;
  category?: string;
  orderCount?: number;
  orders?: OpenOrderItem[];
  summary?: string;
}

export const OpenOrdersCard = React.memo(function OpenOrdersCard({
  resultObj,
}: {
  resultObj: Record<string, unknown>;
}) {
  const data = resultObj as unknown as OpenOrdersData;
  const orders = data.orders || [];
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCancelOrder = async (order: OpenOrderItem) => {
    setCancellingId(order.orderId);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/trade/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_order',
          symbol: order.symbol,
          category: data.category || 'USDT-FUTURES',
          orderId: order.orderId,
          clientOid: order.clientOid,
        }),
      });

      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.success) {
        setCancelledIds((prev) => new Set(prev).add(order.orderId));
      } else {
        setErrorMessage(json.error || 'Failed to cancel order');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Network error');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-lg bg-theme-bg-surface border border-theme-border-subtle text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-theme-border-subtle/50 pb-2">
        <div className="flex items-center gap-1.5">
          <ListFilter className="size-4 text-theme-brand-primary" />
          <span className="font-semibold text-theme-text-primary uppercase tracking-wide">
            Open Working Orders ({orders.length})
          </span>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-theme-bg-elevated text-theme-text-muted text-2xs font-mono">
          {data.category?.toUpperCase() || 'USDT-FUTURES'}
        </span>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="py-4 text-center text-theme-text-muted italic">
          No active unfilled orders found.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {orders.map((o) => {
            const isCancelled = cancelledIds.has(o.orderId);
            const isCancelling = cancellingId === o.orderId;
            const isBuy = o.side === 'buy';

            return (
              <div
                key={o.orderId}
                className="flex items-center justify-between p-2 rounded bg-theme-bg-elevated/50 border border-theme-border-subtle/40 text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold text-2xs uppercase ${
                      isBuy
                        ? 'bg-theme-status-success/15 text-theme-status-success border border-theme-status-success/30'
                        : 'bg-theme-status-danger/15 text-theme-status-danger border border-theme-status-danger/30'
                    }`}
                  >
                    {o.side.toUpperCase()}
                  </span>
                  <span className="font-semibold text-theme-text-primary">{o.symbol}</span>
                  <span className="text-theme-text-secondary">
                    {o.size} @ ${o.price || 'Market'}
                  </span>
                </div>

                <div>
                  {isCancelled ? (
                    <span className="flex items-center gap-1 text-theme-status-success text-2xs font-sans font-medium">
                      <CheckCircle2 className="size-3.5" /> Cancelled
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={() => handleCancelOrder(o)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-theme-bg-surface hover:bg-theme-status-danger/10 hover:text-theme-status-danger border border-theme-border-subtle text-theme-text-muted transition-colors text-2xs"
                    >
                      {isCancelling ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <XCircle className="size-3" />
                      )}
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 p-2 rounded bg-theme-status-danger/10 border border-theme-status-danger/20 text-theme-status-danger text-2xs">
          <AlertCircle className="size-3.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
});
