'use client';

import React from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronRight,
  Ban,
  ShieldAlert,
  X,
} from 'lucide-react';
import type { StagedTradeItem } from '@/hooks/chat';

export interface StagedActionRowProps {
  item: StagedTradeItem;
  now: number;
  onSelect: (id: string) => void;
  onDiscard: (e: React.MouseEvent, id: string) => void;
}

export const StagedActionRow = React.memo(function StagedActionRow({
  item,
  now,
  onSelect,
  onDiscard,
}: StagedActionRowProps) {
  const actionType = item.actionType || 'order';
  const isBuy = item.side === 'buy';
  const remainingSec = Math.max(0, Math.floor((item.expiresAt - now) / 1000));
  const min = Math.floor(remainingSec / 60);
  const sec = remainingSec % 60;
  const isExpired = remainingSec <= 0;

  return (
    <div
      onClick={() => onSelect(item.id)}
      className="p-2.5 hover:bg-theme-bg-elevated/50 transition-colors cursor-pointer flex items-center justify-between gap-2 text-xs group"
    >
      <div className="flex items-center gap-2 min-w-0">
        {actionType === 'order' ? (
          <span
            className={`size-6 rounded flex items-center justify-center font-mono font-bold text-2xs uppercase shrink-0 border ${
              isBuy
                ? 'bg-theme-status-success/15 text-theme-status-success border-theme-status-success/30'
                : 'bg-theme-status-danger/15 text-theme-status-danger border-theme-status-danger/30'
            }`}
          >
            {isBuy ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
          </span>
        ) : actionType === 'cancel' ? (
          <span className="size-6 rounded flex items-center justify-center font-mono font-bold text-2xs uppercase shrink-0 border bg-theme-status-warning/15 text-theme-status-warning border-theme-status-warning/30">
            <Ban className="size-3.5" />
          </span>
        ) : (
          <span className="size-6 rounded flex items-center justify-center font-mono font-bold text-2xs uppercase shrink-0 border bg-theme-status-danger/15 text-theme-status-danger border-theme-status-danger/30">
            <ShieldAlert className="size-3.5" />
          </span>
        )}

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-theme-text-primary truncate">
              {item.symbol}
            </span>
            <span className="font-mono text-2xs text-theme-text-muted uppercase">
              {item.category}
            </span>
            {actionType === 'cancel' ? (
              <span className="px-1 py-0.5 rounded text-2xs font-mono font-bold uppercase bg-theme-status-warning/10 text-theme-status-warning border border-theme-status-warning/20">
                CANCEL
              </span>
            ) : actionType === 'close' ? (
              <span className="px-1 py-0.5 rounded text-2xs font-mono font-bold uppercase bg-theme-status-danger/10 text-theme-status-danger border border-theme-status-danger/20">
                EXIT {item.sizePercent || 100}%
              </span>
            ) : (
              <span
                className={`px-1 py-0.5 rounded text-2xs font-mono font-bold uppercase ${
                  isBuy
                    ? 'bg-theme-status-success/10 text-theme-status-success border border-theme-status-success/20'
                    : 'bg-theme-status-danger/10 text-theme-status-danger border border-theme-status-danger/20'
                }`}
              >
                {isBuy ? 'BUY' : 'SELL'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 font-mono text-2xs text-theme-text-secondary truncate">
            {actionType === 'order' ? (
              <>
                <span>Qty: {item.size}</span>
                <span>•</span>
                <span>${item.price?.toLocaleString() || 'Market'}</span>
              </>
            ) : actionType === 'cancel' ? (
              <span>
                {item.cancelAll
                  ? 'All Working Orders'
                  : `Order #${(item.orderId || item.clientOid || '').substring(0, 8)}`}
              </span>
            ) : (
              <span>
                {item.closeSide === 'buy' ? 'Close Short' : 'Close Long'} (
                {item.closeSize ? `${item.closeSize} units` : `${item.sizePercent || 100}%`})
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center gap-1 text-2xs font-mono text-theme-text-muted">
          <Clock className="size-3" />
          <span>{isExpired ? 'Exp' : `${min}m ${sec}s`}</span>
        </div>

        <button
          type="button"
          onClick={(e) => onDiscard(e, item.id)}
          title="Discard this action"
          aria-label={`Discard ${item.symbol} staged action`}
          className="size-7 sm:size-6 rounded-md flex items-center justify-center text-theme-text-muted hover:text-theme-status-danger hover:bg-theme-status-danger/10 active:scale-95 transition-all cursor-pointer touch-manipulation"
        >
          <X className="size-3.5 sm:size-3" />
        </button>

        <ChevronRight className="size-3.5 text-theme-text-muted group-hover:text-theme-text-primary transition-colors" />
      </div>
    </div>
  );
});
