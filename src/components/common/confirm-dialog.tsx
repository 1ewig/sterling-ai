'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Info, X, Loader2 } from 'lucide-react';
import {
  hoverScaleIcon,
  modalBackdropVariants,
  modalContentVariants,
  tapScaleIcon,
  tapScalePill,
} from '@/constants/animation';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  icon?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Reusable modal confirmation dialog adhering to design tokens,
 * smooth Framer Motion transitions, and accessible dialog semantics.
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  icon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Handle keyboard 'Escape' cancellation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  // Variant styling configs adhering strictly to globals.css theme tokens
  const variantStyles = {
    danger: {
      iconBg: 'bg-theme-status-danger/10 text-theme-status-danger border-theme-status-danger/20',
      confirmBtn: 'bg-theme-status-danger hover:brightness-105 active:brightness-95 text-white font-semibold',
      defaultIcon: <Trash2 className="size-4" />,
    },
    warning: {
      iconBg: 'bg-theme-status-warning/10 text-theme-status-warning border-theme-status-warning/20',
      confirmBtn: 'bg-theme-status-warning hover:brightness-105 active:brightness-95 text-theme-bg-overlay font-semibold',
      defaultIcon: <AlertTriangle className="size-4" />,
    },
    info: {
      iconBg: 'bg-theme-brand-primary/10 text-theme-brand-primary border-theme-brand-primary/20',
      confirmBtn: 'bg-theme-brand-primary hover:brightness-105 active:brightness-95 text-theme-bg-overlay font-bold',
      defaultIcon: <Info className="size-4" />,
    },
  }[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
          className="fixed inset-0 z-50 flex items-center justify-center p-spacing-md"
        >
          {/* Backdrop */}
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => {
              if (!isLoading) onCancel();
            }}
            className="absolute inset-0 bg-theme-bg-overlay/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Dialog Container */}
          <motion.div
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-theme-bg-surface border border-theme-border-subtle rounded-2xl shadow-xl p-spacing-lg z-10 flex flex-col gap-spacing-md overflow-hidden"
          >
            {/* Header with Icon and Close Button */}
            <div className="flex items-start justify-between gap-spacing-sm">
              <div
                className={`size-9 rounded-xl flex items-center justify-center border shrink-0 ${variantStyles.iconBg}`}
              >
                {icon ?? variantStyles.defaultIcon}
              </div>

              <motion.button
                type="button"
                whileHover={hoverScaleIcon}
                whileTap={tapScaleIcon}
                onClick={onCancel}
                disabled={isLoading}
                title="Close dialog"
                aria-label="Close dialog"
                className="p-1 rounded-lg text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-bg-elevated transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
              >
                <X className="size-4" />
              </motion.button>
            </div>

            {/* Title & Description */}
            <div className="flex flex-col gap-spacing-xs">
              <h3
                id="confirm-dialog-title"
                className="text-sm font-bold text-theme-text-primary tracking-tight"
              >
                {title}
              </h3>
              <div
                id="confirm-dialog-description"
                className="text-xs text-theme-text-secondary leading-relaxed"
              >
                {description}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-spacing-xs">
              <motion.button
                type="button"
                whileTap={tapScalePill}
                onClick={onCancel}
                disabled={isLoading}
                className="h-9 px-spacing-md flex items-center justify-center rounded-xl bg-theme-bg-elevated hover:bg-theme-bg-surface active:bg-theme-bg-elevated text-theme-text-secondary hover:text-theme-text-primary border border-theme-border-subtle hover:border-theme-border-strong text-xs font-semibold cursor-pointer transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed select-none"
              >
                {cancelLabel}
              </motion.button>

              <motion.button
                type="button"
                whileTap={tapScalePill}
                onClick={() => void onConfirm()}
                disabled={isLoading}
                className={`h-9 px-spacing-md flex items-center justify-center gap-spacing-xs rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed select-none ${variantStyles.confirmBtn}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    <span>{confirmLabel}</span>
                  </>
                ) : (
                  <span>{confirmLabel}</span>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}