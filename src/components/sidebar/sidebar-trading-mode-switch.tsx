'use client';

import React, { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Zap, KeyRound } from 'lucide-react';
import { sidebarHorizontalCollapseVariants, tapScalePill } from '@/constants/animation';
import { useTradingModeStore } from '@/stores/trading-mode-store';

export interface SidebarTradingModeSwitchProps {
  isCollapsed: boolean;
}

/**
 * Pure presentation & interaction switcher for Sandbox vs Live/Demo trading modes.
 * Displayed in the LeftSidebar footer above the Theme toggle.
 */
export const SidebarTradingModeSwitch = memo(function SidebarTradingModeSwitch({
  isCollapsed,
}: SidebarTradingModeSwitchProps) {
  const mode = useTradingModeStore((s) => s.mode);
  const setTradingMode = useTradingModeStore((s) => s.setTradingMode);
  const openKeysModal = useTradingModeStore((s) => s.openKeysModal);
  const credentials = useTradingModeStore((s) => s.credentials);

  const isSandbox = mode === 'sandbox';

  const handleToggle = useCallback(() => {
    if (isSandbox) {
      // If switching from Sandbox to Live, open keys modal if not configured
      if (!credentials?.apiKey) {
        openKeysModal();
      } else {
        setTradingMode('live');
      }
    } else {
      setTradingMode('sandbox');
    }
  }, [isSandbox, credentials, openKeysModal, setTradingMode]);

  return (
    <div className="pt-spacing-sm pb-1 px-3.5 flex flex-col bg-theme-bg-base shrink-0 items-center">
      <div className="h-10 w-full flex items-center rounded-xl bg-theme-bg-elevated/70 hover:bg-theme-bg-surface border border-theme-border-subtle hover:border-theme-border-strong text-theme-text-secondary hover:text-theme-text-primary text-xs font-semibold transition-colors shadow-2xs overflow-hidden">
        {/* Main Mode Toggle Button */}
        <motion.button
          type="button"
          whileTap={tapScalePill}
          onClick={handleToggle}
          title={isSandbox ? 'Switch to Live / Demo Mode' : 'Switch to Sandbox Mode'}
          aria-label={isSandbox ? 'Sandbox Mode' : 'Live Mode'}
          className="flex-1 h-full flex items-center min-w-0 cursor-pointer overflow-hidden text-left"
        >
          {/* Anchored Mode Icon Slot */}
          <div className="size-10 flex items-center justify-center shrink-0">
            {isSandbox ? (
              <FlaskConical className="size-4 text-amber-400" />
            ) : (
              <Zap className="size-4 text-emerald-400" />
            )}
          </div>

          {/* Label and Badge Container */}
          <motion.div
            initial={false}
            variants={sidebarHorizontalCollapseVariants}
            animate={isCollapsed ? 'collapsed' : 'expanded'}
            className="flex-1 flex items-center justify-between min-w-0 overflow-hidden whitespace-nowrap pr-1.5"
          >
            <div className="flex flex-col min-w-0 pr-1">
              <span className="text-2xs text-theme-text-muted leading-tight">Mode</span>
              <span className="text-xs font-semibold text-theme-text-primary truncate">
                {isSandbox ? 'Sandbox' : credentials?.isDemo ? 'Demo v3' : 'Live UTA'}
              </span>
            </div>

            <kbd
              className={`text-2xs px-1.5 py-0.5 rounded font-mono font-bold tracking-wider border ${
                isSandbox
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}
            >
              {isSandbox ? 'PAPER' : 'LIVE'}
            </kbd>
          </motion.div>
        </motion.button>

        {/* Configuration Gear / Key Modal Launcher */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={openKeysModal}
            title="Configure Bitget API Keys"
            aria-label="Configure Bitget API Keys"
            className="h-full px-2.5 flex items-center justify-center border-l border-theme-border-subtle/50 text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-bg-elevated transition-colors cursor-pointer shrink-0"
          >
            <KeyRound className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
});
