'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/app-store';
import { useBitgetWebSocket } from '@/hooks/market';
import { StreamerHeader } from './streamer-header';
import { SymbolSelector } from './symbol-selector';
import { TickerDisplay } from './ticker-display';
import { OrderbookDepthMini } from './orderbook-depth-mini';

/**
 * Collapsible Right-Side Market Streamer Panel.
 * Renders live tick-by-tick Bitget WebSocket feed with responsive drawer behavior on mobile.
 */
export const MarketStreamerPanel = memo(function MarketStreamerPanel() {
  const isMarketPanelOpen = useAppStore((state) => state.isMarketPanelOpen);
  const setIsMarketPanelOpen = useAppStore((state) => state.setIsMarketPanelOpen);
  const selectedMarketSymbol = useAppStore((state) => state.selectedMarketSymbol);
  const setSelectedMarketSymbol = useAppStore((state) => state.setSelectedMarketSymbol);
  const selectedMarketType = useAppStore((state) => state.selectedMarketType);
  const setSelectedMarketType = useAppStore((state) => state.setSelectedMarketType);

  // Hook only runs active WebSocket connection when the panel is opened
  const { ticker, orderbook, candles, status, tickDirection } = useBitgetWebSocket({
    symbol: selectedMarketSymbol,
    instType: selectedMarketType,
    enabled: isMarketPanelOpen,
  });

  const handleClose = () => {
    setIsMarketPanelOpen(false);
  };

  return (
    <>
      {/* Desktop Persistent Collapsible Right Panel */}
      <AnimatePresence>
        {isMarketPanelOpen && (
          <motion.aside
            key="desktop-market-streamer"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '40%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="hidden md:flex flex-col h-full bg-theme-bg-base border-l border-theme-border-subtle shrink-0 select-none overflow-hidden relative z-20"
          >
            <div className="w-full min-w-0 flex flex-col h-full overflow-hidden">
              <StreamerHeader
                status={status}
                symbol={selectedMarketSymbol}
                onClose={handleClose}
              />
              <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3.5 no-scrollbar">
                <SymbolSelector
                  currentSymbol={selectedMarketSymbol}
                  currentType={selectedMarketType}
                  onSelectSymbol={setSelectedMarketSymbol}
                  onSelectType={setSelectedMarketType}
                />
                <TickerDisplay
                  ticker={ticker}
                  candles={candles}
                  tickDirection={tickDirection}
                  symbol={selectedMarketSymbol}
                  marketType={selectedMarketType}
                />
                <OrderbookDepthMini orderbook={orderbook} />
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Slide-Over Drawer with Backdrop */}
      <AnimatePresence>
        {isMarketPanelOpen && (
          <>
            <motion.div
              key="mobile-streamer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleClose}
              className="fixed inset-0 bg-theme-bg-overlay/80 backdrop-blur-xs z-50 md:hidden"
              aria-hidden="true"
            />
            <motion.aside
              key="mobile-streamer-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Live Market Streamer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 right-0 w-[320px] sm:w-[380px] max-w-[85vw] h-dvh max-h-dvh bg-theme-bg-base border-l border-theme-border-subtle z-50 flex flex-col md:hidden select-none overflow-hidden shadow-2xl shadow-black/50"
            >
              <StreamerHeader
                status={status}
                symbol={selectedMarketSymbol}
                onClose={handleClose}
              />
              <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3.5 no-scrollbar">
                <SymbolSelector
                  currentSymbol={selectedMarketSymbol}
                  currentType={selectedMarketType}
                  onSelectSymbol={setSelectedMarketSymbol}
                  onSelectType={setSelectedMarketType}
                />
                <TickerDisplay
                  ticker={ticker}
                  candles={candles}
                  tickDirection={tickDirection}
                  symbol={selectedMarketSymbol}
                  marketType={selectedMarketType}
                />
                <OrderbookDepthMini orderbook={orderbook} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
});
