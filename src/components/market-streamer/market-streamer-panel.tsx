'use client';

import React, { memo, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/app-store';
import { useBitgetWebSocket } from '@/hooks/market';
import type { WsConnectionStatus, TickDirection, MicroCandle } from '@/hooks/market';
import type { BitgetWsTickerData, BitgetWsBookData } from '@/lib/bitget/types';
import { AgentLoader } from '@/components/common';
import { TickerDisplay } from './ticker-display';
import { DerivativesMetrics } from './derivatives-metrics';
import { OrderbookDepthMini } from './orderbook-depth-mini';

interface StreamerContentProps {
  isConnecting: boolean;
  status: WsConnectionStatus;
  symbol: string;
  ticker: BitgetWsTickerData | null;
  candles: MicroCandle[];
  tickDirection: TickDirection;
  futuresTicker: BitgetWsTickerData | null;
  orderbook: BitgetWsBookData | null;
}

const StreamerContent = memo(function StreamerContent({
  isConnecting,
  status,
  symbol,
  ticker,
  candles,
  tickDirection,
  futuresTicker,
  orderbook,
}: StreamerContentProps) {
  if (isConnecting) {
    return (
      <div className="flex-1 min-h-[360px] flex flex-col items-center justify-center gap-3.5 p-6 select-none text-theme-text-muted">
        <AgentLoader className="size-6 text-theme-brand-primary" />
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-xs font-mono font-medium text-theme-text-primary">
            {status === 'error'
              ? 'Reconnecting to live stream...'
              : `Connecting to ${symbol}...`}
          </span>
          <span className="text-2xs font-mono text-theme-text-muted">
            Bitget Public v2 WebSocket
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <TickerDisplay
        ticker={ticker}
        candles={candles}
        tickDirection={tickDirection}
        symbol={symbol}
      />
      <DerivativesMetrics futuresTicker={futuresTicker} />
      <OrderbookDepthMini orderbook={orderbook} />
    </>
  );
});

function subscribeMediaQuery(callback: () => void) {
  const mql = window.matchMedia('(max-width: 767px)');
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getMobileSnapshot() {
  return window.matchMedia('(max-width: 767px)').matches;
}

function getMobileServerSnapshot() {
  return false;
}

/**
 * Responsive viewport check hook to avoid duplicate React mounts on desktop vs mobile.
 */
function useIsMobile() {
  return useSyncExternalStore(subscribeMediaQuery, getMobileSnapshot, getMobileServerSnapshot);
}

/**
 * Collapsible Right-Side Market Streamer Panel.
 * Renders live tick-by-tick Bitget WebSocket feed with responsive drawer behavior on mobile.
 */
export const MarketStreamerPanel = memo(function MarketStreamerPanel() {
  const isMarketPanelOpen = useAppStore((state) => state.isMarketPanelOpen);
  const setIsMarketPanelOpen = useAppStore((state) => state.setIsMarketPanelOpen);
  const selectedMarketSymbol = useAppStore((state) => state.selectedMarketSymbol);

  const isMobile = useIsMobile();

  // Hook only runs active WebSocket connection when the panel is opened
  const { ticker, futuresTicker, orderbook, candles, status, tickDirection } = useBitgetWebSocket({
    symbol: selectedMarketSymbol,
    enabled: isMarketPanelOpen,
  });

  const handleClose = () => {
    setIsMarketPanelOpen(false);
  };

  const isConnecting = status !== 'connected' || !ticker;

  return (
    <>
      {/* Desktop Persistent Collapsible Right Panel (Only mounted on desktop viewport) */}
      <AnimatePresence>
        {isMarketPanelOpen && !isMobile && (
          <motion.aside
            key="desktop-market-streamer"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '40%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col h-full bg-transparent shrink-0 select-none overflow-hidden relative z-20"
          >
            <div className="w-full min-w-0 flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3.5 overscroll-contain transform-gpu [will-change:scroll-position]">
                <StreamerContent
                  isConnecting={isConnecting}
                  status={status}
                  symbol={selectedMarketSymbol}
                  ticker={ticker}
                  candles={candles}
                  tickDirection={tickDirection}
                  futuresTicker={futuresTicker}
                  orderbook={orderbook}
                />
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Slide-Over Drawer with Backdrop (Only mounted on mobile viewport) */}
      <AnimatePresence>
        {isMarketPanelOpen && isMobile && (
          <>
            <motion.div
              key="mobile-streamer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleClose}
              className="fixed inset-0 bg-theme-bg-overlay/80 backdrop-blur-xs z-50"
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
              className="fixed inset-y-0 right-0 w-[320px] sm:w-[380px] max-w-[85vw] h-dvh max-h-dvh bg-theme-bg-surface border-l border-theme-border-subtle z-50 flex flex-col select-none overflow-hidden shadow-2xl shadow-black/50"
            >
              <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3.5 overscroll-contain transform-gpu [will-change:scroll-position]">
                <StreamerContent
                  isConnecting={isConnecting}
                  status={status}
                  symbol={selectedMarketSymbol}
                  ticker={ticker}
                  candles={candles}
                  tickDirection={tickDirection}
                  futuresTicker={futuresTicker}
                  orderbook={orderbook}
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
});
