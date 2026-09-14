'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { StagedTradeItem } from './use-staged-actions';

export interface UseExecuteTradeOptions {
  activeTrade: StagedTradeItem | null;
  remainingSeconds: number;
  updateActionStatus: (id: string, update: Partial<StagedTradeItem>) => Promise<void>;
  onClose: () => void;
  autoCloseDelayMs?: number;
}

export type ExecutionState = 'idle' | 'executing' | 'success' | 'error';

export function useExecuteTrade({
  activeTrade,
  remainingSeconds,
  updateActionStatus,
  onClose,
  autoCloseDelayMs = 2000,
}: UseExecuteTradeOptions) {
  const [localExecutionState, setLocalExecutionState] = useState<ExecutionState>('idle');
  const [localResponseMessage, setLocalResponseMessage] = useState<string | null>(null);

  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const executionState: ExecutionState =
    activeTrade?.status === 'executed'
      ? 'success'
      : activeTrade?.status === 'executing'
        ? 'executing'
        : localExecutionState;

  const responseMessage =
    activeTrade?.status === 'executed'
      ? activeTrade.orderIdResult
        ? `Order #${activeTrade.orderIdResult.substring(0, 8)} filled`
        : localResponseMessage || 'Action executed successfully'
      : localResponseMessage || activeTrade?.executionError || null;

  const handleClose = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLocalExecutionState('idle');
    setLocalResponseMessage(null);
    onClose();
  }, [onClose]);

  const scheduleAutoClose = useCallback(() => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = setTimeout(handleClose, autoCloseDelayMs);
  }, [handleClose, autoCloseDelayMs]);

  const executeApi = useCallback(
    async (
      url: string,
      payload: Record<string, unknown>,
      onSuccessMessage: (data: { orderId?: string; message?: string }) => string
    ) => {
      if (!activeTrade || executionState === 'executing' || remainingSeconds <= 0) return;

      setLocalExecutionState('executing');
      setLocalResponseMessage(null);
      await updateActionStatus(activeTrade.id, { status: 'executing' });

      abortControllerRef.current = new AbortController();

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify(payload),
        });

        const json = (await res.json()) as {
          success?: boolean;
          orderId?: string;
          message?: string;
          error?: string;
        };

        if (json.success) {
          setLocalExecutionState('success');
          const successMsg = onSuccessMessage(json);
          setLocalResponseMessage(successMsg);
          await updateActionStatus(activeTrade.id, {
            status: 'executed',
            ...(json.orderId ? { orderIdResult: json.orderId } : {}),
          });
          scheduleAutoClose();
        } else {
          const errMsg = json.error || 'Action execution rejected';
          setLocalExecutionState('error');
          setLocalResponseMessage(errMsg);
          await updateActionStatus(activeTrade.id, { status: 'staged', executionError: errMsg });
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const errMsg = err instanceof Error ? err.message : 'Network error';
        setLocalExecutionState('error');
        setLocalResponseMessage(errMsg);
        await updateActionStatus(activeTrade.id, { status: 'staged', executionError: errMsg });
      }
    },
    [activeTrade, executionState, remainingSeconds, updateActionStatus, scheduleAutoClose]
  );

  const confirmOrder = useCallback(async () => {
    if (!activeTrade) return;
    await executeApi(
      '/api/trade/execute',
      {
        ticketToken: activeTrade.ticketToken,
        symbol: activeTrade.symbol,
        category: activeTrade.category,
        side: activeTrade.side,
        orderType: activeTrade.orderType,
        size: activeTrade.size,
        price: activeTrade.price,
        tradeSide: activeTrade.tradeSide,
        leverage: activeTrade.leverage,
        stopLossPrice: activeTrade.stopLossPrice,
        takeProfitPrice: activeTrade.takeProfitPrice,
      },
      (json) =>
        json.message ||
        (json.orderId ? `Order #${json.orderId.substring(0, 8)} filled` : 'Order executed')
    );
  }, [activeTrade, executeApi]);

  const confirmCancel = useCallback(async () => {
    if (!activeTrade) return;
    await executeApi(
      '/api/trade/action',
      {
        actionToken: activeTrade.actionToken,
        action: activeTrade.action || (activeTrade.cancelAll ? 'cancel_symbol' : 'cancel_order'),
        symbol: activeTrade.symbol,
        category: activeTrade.category,
        orderId: activeTrade.orderId,
        clientOid: activeTrade.clientOid,
      },
      (json) =>
        json.message ||
        (activeTrade.cancelAll ? 'All working orders cancelled' : 'Order cancelled successfully')
    );
  }, [activeTrade, executeApi]);

  const confirmClose = useCallback(async () => {
    if (!activeTrade) return;
    await executeApi(
      '/api/trade/action',
      {
        actionToken: activeTrade.actionToken,
        action: 'close_position',
        symbol: activeTrade.symbol,
        category: activeTrade.category,
        side: activeTrade.closeSide || activeTrade.side,
        size: activeTrade.closeSize,
      },
      (json) => json.message || 'Position exit submitted successfully'
    );
  }, [activeTrade, executeApi]);

  return {
    executionState,
    responseMessage,
    handleClose,
    confirmOrder,
    confirmCancel,
    confirmClose,
  };
}
