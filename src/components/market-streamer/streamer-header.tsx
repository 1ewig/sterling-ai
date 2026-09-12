'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { X, Activity } from 'lucide-react';
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
    <div className="h-14 px-4 border-b border-theme-border-subtle flex items-center justify-between shrink-0 select-none bg-theme-bg-base/60 backdrop-blur-xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="size-8 rounded-lg bg-theme-bg-surface flex items-center justify-center border border-theme-border-subtle text-theme-brand-primary shrink-0">
          <Activity className="size-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-tight text-theme-text-primary">
              Live Streamer
            </span>
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-theme-bg-surface border border-theme-border-subtle">
              <span
                className={`size-1.5 rounded-full ${
                  status === 'connected'
                    ? 'bg-theme-status-success animate-pulse'
                    : status === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-theme-status-danger'
                }`}
              />
              <span className="text-3xs font-mono font-bold text-theme-text-secondary uppercase">
                {status === 'connected' ? 'LIVE' : status}
              </span>
            </div>
          </div>
          <span className="text-2xs font-mono text-theme-text-muted truncate">
            Bitget v2 WS &bull; {symbol}
          </span>
        </div>
      </div>

      <motion.button
        type="button"
        whileTap={tapScalePill}
        onClick={onClose}
        title="Close Market Streamer"
        aria-label="Close Market Streamer"
        className="size-8 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-bg-surface active:bg-theme-bg-elevated border border-transparent hover:border-theme-border-subtle transition-colors cursor-pointer"
      >
        <X className="size-4 stroke-[2]" />
      </motion.button>
    </div>
  );
});
