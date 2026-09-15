'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, Shield, Check, X, Eye, EyeOff, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { EASING_ARCHITECTURAL } from '@/constants/animation';
import { useTradingModeStore, type BitgetApiCredentials } from '@/stores/trading-mode-store';

export interface ApiKeysModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface ApiKeysModalContentProps {
  credentials: BitgetApiCredentials | null;
  onClose: () => void;
  setCredentials: (creds: BitgetApiCredentials) => void;
}

function ApiKeysModalContent({
  credentials,
  onClose,
  setCredentials,
}: ApiKeysModalContentProps) {
  const [apiKey, setApiKey] = useState(() => credentials?.apiKey || '');
  const [apiSecret, setApiSecret] = useState(() => credentials?.apiSecret || '');
  const [passphrase, setPassphrase] = useState(() => credentials?.passphrase || '');
  const [isDemo, setIsDemo] = useState(() => credentials?.isDemo ?? true);
  const [showSecret, setShowSecret] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isVerifying) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVerifying, onClose]);

  const handleSave = useCallback(async () => {
    if (!apiKey.trim() || !apiSecret.trim() || !passphrase.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please fill in all API key fields (Key, Secret, and Passphrase).',
      });
      return;
    }

    setIsVerifying(true);
    setStatusMessage(null);

    const newCreds: BitgetApiCredentials = {
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
      passphrase: passphrase.trim(),
      isDemo,
    };

    try {
      setCredentials(newCreds);
      setStatusMessage({
        type: 'success',
        text: 'Bitget credentials saved. Live / Demo mode activated!',
      });
      setTimeout(() => {
        onClose();
      }, 500);
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Failed to save credentials.',
      });
    } finally {
      setIsVerifying(false);
    }
  }, [apiKey, apiSecret, passphrase, isDemo, setCredentials, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={() => !isVerifying && onClose()}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 4 }}
        transition={{ duration: 0.18, ease: EASING_ARCHITECTURAL }}
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl bg-theme-bg-surface border border-theme-border-subtle shadow-2xl overflow-hidden flex flex-col z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-theme-border-subtle/50">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-theme-brand-primary/10 border border-theme-brand-primary/30 flex items-center justify-center text-theme-brand-primary">
              <KeyRound className="size-4" />
            </div>
            <div>
              <h3 className="font-semibold text-xs text-theme-text-primary tracking-tight">
                Bitget Exchange Credentials
              </h3>
              <p className="text-2xs text-theme-text-muted">
                Connect Live or Paper Trading keys
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isVerifying}
            onClick={onClose}
            className="p-1 -mr-1 rounded-md text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-bg-elevated transition-colors disabled:opacity-30 cursor-pointer"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="p-5 space-y-3.5 text-xs">
          {/* Security Notice */}
          <div className="p-2.5 rounded-xl bg-theme-bg-elevated/50 border border-theme-border-subtle/60 flex items-start gap-2 text-2xs text-theme-text-secondary">
            <Shield className="size-4 text-theme-brand-primary shrink-0 mt-0.5" />
            <span>
              Your API keys are stored exclusively in your browser&apos;s local storage and never baked into server logs.
            </span>
          </div>

          {/* API Key */}
          <div className="space-y-1">
            <label className="block text-2xs font-semibold text-theme-text-primary uppercase tracking-wider">
              API Key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="bg_..."
              className="w-full px-3 py-2 rounded-lg bg-theme-bg-base border border-theme-border-subtle focus:border-theme-brand-primary text-theme-text-primary font-mono text-xs outline-none transition-colors"
            />
          </div>

          {/* API Secret */}
          <div className="space-y-1">
            <label className="block text-2xs font-semibold text-theme-text-primary uppercase tracking-wider">
              API Secret
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="••••••••••••••••••••••••"
                className="w-full pl-3 pr-9 py-2 rounded-lg bg-theme-bg-base border border-theme-border-subtle focus:border-theme-brand-primary text-theme-text-primary font-mono text-xs outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowSecret((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text-primary transition-colors cursor-pointer"
              >
                {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* Passphrase */}
          <div className="space-y-1">
            <label className="block text-2xs font-semibold text-theme-text-primary uppercase tracking-wider">
              Passphrase
            </label>
            <div className="relative">
              <input
                type={showPassphrase ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-3 pr-9 py-2 rounded-lg bg-theme-bg-base border border-theme-border-subtle focus:border-theme-brand-primary text-theme-text-primary font-mono text-xs outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text-primary transition-colors cursor-pointer"
              >
                {showPassphrase ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* Demo / Paper Trading Checkbox */}
          <label className="flex items-center gap-2 p-2 rounded-lg bg-theme-bg-base border border-theme-border-subtle/70 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isDemo}
              onChange={(e) => setIsDemo(e.target.checked)}
              className="size-3.5 rounded border-theme-border-subtle text-theme-brand-primary focus:ring-0 cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-theme-text-primary">
                Bitget Demo / Paper Trading Account
              </span>
              <span className="text-2xs text-theme-text-muted">
                Enables simulated testnet fills on Bitget UTA v3
              </span>
            </div>
          </label>

          {/* Status alerts */}
          {statusMessage && (
            <div
              className={`p-2 rounded-lg text-2xs flex items-center gap-1.5 border ${
                statusMessage.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}
            >
              {statusMessage.type === 'error' ? (
                <AlertCircle className="size-3.5 shrink-0" />
              ) : (
                <Check className="size-3.5 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="p-5 pt-2 flex items-center justify-between gap-2 border-t border-theme-border-subtle/50 bg-theme-bg-elevated/20">
          <a
            href="https://www.bitget.com/account/api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-2xs text-theme-text-muted hover:text-theme-text-primary transition-colors"
          >
            <span>Get Bitget API Keys</span>
            <ExternalLink className="size-3" />
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-medium text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-elevated transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isVerifying}
              onClick={handleSave}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-theme-brand-primary text-theme-bg-overlay hover:brightness-105 transition-all shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  <span>Save & Activate</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export const ApiKeysModal = React.memo(function ApiKeysModal({
  isOpen: propIsOpen,
  onClose: propOnClose,
}: ApiKeysModalProps) {
  const storeIsOpen = useTradingModeStore((s) => s.isKeysModalOpen);
  const storeClose = useTradingModeStore((s) => s.closeKeysModal);
  const credentials = useTradingModeStore((s) => s.credentials);
  const setCredentials = useTradingModeStore((s) => s.setCredentials);

  const isOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen;
  const onClose = propOnClose || storeClose;

  return (
    <AnimatePresence>
      {isOpen && (
        <ApiKeysModalContent
          credentials={credentials}
          onClose={onClose}
          setCredentials={setCredentials}
        />
      )}
    </AnimatePresence>
  );
});
