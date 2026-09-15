'use client';

import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EASING_ARCHITECTURAL } from '@/constants/animation';
import { useAppStore } from '@/stores/app-store';
import { useBitgetWebSocket } from '@/hooks/market';
import type { MarketStreamState } from '@/hooks/market';
import { useIsMobile } from '@/hooks/ui/use-is-mobile';
import { AgentLoader } from '@/components/common';
import { TickerDisplay } from './ticker-display';
import { DerivativesMetrics } from './derivatives-metrics';
import { OrderbookDepthMini } from './orderbook-depth-mini';
import { SymbolSearchPopover } from './symbol-search-popover';

interface StreamerContentProps {
  market: MarketStreamState;
  onOpenSearch: () => void;
}

const StreamerContent = memo(function StreamerContent({
  market,
  onOpenSearch,
}: StreamerContentProps) {
  if (market.isConnecting) {
    return (
      <div className="flex-1 min-h-[360px] flex flex-col items-center justify-center gap-3.5 p-6 select-none text-theme-text-muted">
        <AgentLoader className="size-6 text-theme-brand-primary" />
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-xs font-mono font-medium text-theme-text-primary">
            {market.status === 'error'
              ? 'Reconnecting to live stream...'
              : `Connecting to ${market.symbol}...`}
          </span>
          <span className="text-2xs font-mono text-theme-text-muted">
            Bitget Unified v3 (UTA) WebSocket
          </span>
        </div>
      </div>
    );
  }


  return (
    <>
      <TickerDisplay
        ticker={market.ticker}
        candles={market.candles}
        tickDirection={market.tickDirection}
        symbol={market.symbol}
        marketType={market.marketType}
        onOpenSearch={onOpenSearch}
      />
      <DerivativesMetrics futuresTicker={market.futuresTicker} />
      <OrderbookDepthMini orderbook={market.orderbook} />
    </>
  );
});

const StreamerScrollBody = memo(function StreamerScrollBody({
  market,
  onOpenSearch,
}: StreamerContentProps) {
  return (
    <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3.5 overscroll-contain transform-gpu [will-change:scroll-position]">
      <StreamerContent market={market} onOpenSearch={onOpenSearch} />
    </div>
  );
});

/**
 * Main Orchestrator for the Market Streamer.
 * Manages WebSocket lifecycle, Zustand state subscriptions, modal visibility, and prop distribution.
 */
export const MarketStreamerPanel = memo(function MarketStreamerPanel() {
  const isMarketPanelOpen = useAppStore((state) => state.isMarketPanelOpen);
  const selectedMarketSymbol = useAppStore((state) => state.selectedMarketSymbol);
  const setSelectedMarketSymbol = useAppStore((state) => state.setSelectedMarketSymbol);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isMobile = useIsMobile();

  const stream = useBitgetWebSocket({
    symbol: selectedMarketSymbol,
    enabled: isMarketPanelOpen,
  });

  const isConnecting = stream.status !== 'connected' || (!stream.ticker && !stream.futuresTicker);
  const market: MarketStreamState = {
    ...stream,
    symbol: selectedMarketSymbol,
    isConnecting,
  };

  const handleOpenSearch = () => {
    setIsSearchOpen(true);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
  };

  const handleSelectSymbol = (symbol: string) => {
    setSelectedMarketSymbol(symbol);
    setIsSearchOpen(false);
  };

  return (
    <>
      {/* Desktop Persistent Collapsible Right Panel */}
      <AnimatePresence>
        {isMarketPanelOpen && !isMobile && (
          <motion.aside
            key="desktop-market-streamer"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '40%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: EASING_ARCHITECTURAL }}
            className="flex flex-col h-full bg-transparent shrink-0 select-none overflow-hidden relative z-20"
          >
            <div className="w-full min-w-0 flex flex-col h-full overflow-hidden">
              <StreamerScrollBody market={market} onOpenSearch={handleOpenSearch} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Full-Screen Market Streamer View */}
      <AnimatePresence>
        {isMarketPanelOpen && isMobile && (
          <motion.aside
            key="mobile-market-streamer-fullscreen"
            role="dialog"
            aria-modal="true"
            aria-label="Live Market Streamer"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed top-14 inset-x-0 bottom-0 w-full bg-theme-bg-base z-20 flex flex-col select-none overflow-hidden"
          >
            <StreamerScrollBody market={market} onOpenSearch={handleOpenSearch} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Symbol Search Modal */}
      <SymbolSearchPopover
        isOpen={isSearchOpen}
        currentSymbol={selectedMarketSymbol}
        onSelectSymbol={handleSelectSymbol}
        onClose={handleCloseSearch}
      />
    </>
  );
});

