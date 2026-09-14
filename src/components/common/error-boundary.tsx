'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; reset: () => void }) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  name?: string;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Reusable React Error Boundary for isolating UI widget failures.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  public override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && this.props.resetKeys && prevProps.resetKeys) {
      const hasKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasKeyChanged) {
        this.reset();
      }
    }
  }

  public reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public override render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({
          error: this.state.error,
          reset: this.reset,
        });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      const componentName = this.props.name || 'Component';

      return (
        <div className="w-full p-4 rounded-xl bg-theme-bg-surface border border-theme-status-danger/20 flex flex-col items-center justify-center text-center gap-3 shadow-2xs my-2">
          <div className="size-9 rounded-lg bg-theme-status-danger/10 border border-theme-status-danger/20 flex items-center justify-center text-theme-status-danger">
            <AlertTriangle className="size-4.5" />
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-bold text-theme-text-primary">
              {componentName} Interrupted
            </h3>
            <p className="text-2xs text-theme-text-muted max-w-sm">
              {this.state.error.message || 'An unexpected rendering error occurred in this section.'}
            </p>
          </div>

          <button
            type="button"
            onClick={this.reset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-bg-elevated hover:bg-theme-bg-base border border-theme-border-subtle hover:border-theme-border-strong text-2xs font-semibold text-theme-text-primary transition-colors cursor-pointer select-none"
          >
            <RotateCcw className="size-3 text-theme-text-muted" />
            <span>Retry</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
