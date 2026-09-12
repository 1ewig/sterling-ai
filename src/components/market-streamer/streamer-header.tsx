'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { tapScalePill } from '@/constants/animation';
import type { WsConnectionStatus } from '@/hooks/market';

interface StreamerHeaderProps {
  status: WsConnectionStatus;
  symbol: string;
  onClose: () => void;
}

export const StreamerHeader = memo(function StreamerHeader({
  status,
  symbol,
  onClose,
}: StreamerHeaderProps) {
  return (
    <div className="h-11 px-3.5 border-b border-theme-border-subtle flex items-center justify-between shrink-0 select-none bg-theme-bg-base/40">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`size-1.5 rounded-full shrink-0 ${
            status === 'connected'
              ? 'bg-theme-status-success'
              : status === 'connecting'
              ? 'bg-amber-400 animate-pulse'
              : 'bg-theme-status-danger'
          }`}
        />
        <span className="text-xs font-semibold text-theme-text-primary tracking-tight">
          Market Data
        </span>
        <span className="text-2xs font-mono text-theme-text-muted">
          &bull; {symbol}
        </span>
      </div>

      <motion.button
        type="button"
        whileTap={tapScalePill}
        onClick={onClose}
        title="Close Panel"
        aria-label="Close Panel"
        className="size-7 rounded-md flex items-center justify-center text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-bg-surface transition-colors cursor-pointer"
      >
        <X className="size-3.5" />
      </motion.button>
    </div>
  );
});
