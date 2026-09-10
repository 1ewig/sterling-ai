'use client';

import { useRef, useEffect, useLayoutEffect, useCallback } from 'react';

// Safe SSR-compatible layout effect executing before browser paint on client
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export interface UseChatScrollOptions {
  activeConversationId: string;
  messagesCount: number;
  streamStepCount: number;
  streamContentLength: number;
  isLoading: boolean;
}

/**
 * Custom hook managing message list scrolling, auto-scroll detection,
 * and user-interrupt handling to prevent fighting the user during active SSE streaming.
 */
export function useChatScroll({
  activeConversationId,
  messagesCount,
  streamStepCount,
  streamContentLength,
  isLoading,
}: UseChatScrollOptions) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabledRef = useRef<boolean>(true);
  const rafIdRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef<number>(0);
  const isProgrammaticScrollRef = useRef<boolean>(false);

  // Helper to safely programmatically scroll to bottom
  const performProgrammaticScroll = useCallback((smooth = false) => {
    const container = scrollContainerRef.current;
    if (!container) {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
      return;
    }

    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    if (Math.abs(container.scrollTop - maxScrollTop) > 1) {
      isProgrammaticScrollRef.current = true;
      if (smooth && maxScrollTop > 0) {
        container.scrollTo({
          top: maxScrollTop,
          behavior: 'smooth',
        });
      } else {
        container.scrollTop = maxScrollTop;
      }
    }
    lastScrollTopRef.current = container.scrollTop;
  }, []);

  // Public scrollToBottom action (e.g. called when user sends a new message)
  const scrollToBottom = useCallback((smooth = false) => {
    isAutoScrollEnabledRef.current = true;
    performProgrammaticScroll(smooth);
  }, [performProgrammaticScroll]);

  // Handle user scroll events
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Ignore scroll events dispatched by programmatic auto-scrolling
    if (isProgrammaticScrollRef.current) {
      isProgrammaticScrollRef.current = false;
      lastScrollTopRef.current = container.scrollTop;
      return;
    }

    const currentScrollTop = container.scrollTop;
    const isScrollingUp = currentScrollTop < lastScrollTopRef.current;
    lastScrollTopRef.current = currentScrollTop;

    const distanceFromBottom = container.scrollHeight - currentScrollTop - container.clientHeight;

    if (isScrollingUp && distanceFromBottom > 20) {
      // User scrolled up: interrupt auto-scroll immediately!
      isAutoScrollEnabledRef.current = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    } else if (distanceFromBottom <= 30) {
      // User scrolled all the way back down to the bottom: resume auto-scroll
      isAutoScrollEnabledRef.current = true;
    }
  }, []);

  // Direct user gesture listeners (wheel and touch) for immediate interruption
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let touchStartY = 0;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        // User actively wheeled up: interrupt auto-scroll instantly
        isAutoScrollEnabledRef.current = false;
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      } else if (e.deltaY > 0) {
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceFromBottom <= 30) {
          isAutoScrollEnabledRef.current = true;
        }
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const currentY = e.touches[0].clientY;
        // Dragging finger downwards scrolls the content upwards
        if (currentY > touchStartY + 6) {
          isAutoScrollEnabledRef.current = false;
          if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
          }
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Synchronously lock scroll to bottom on conversation switch
  useIsomorphicLayoutEffect(() => {
    isAutoScrollEnabledRef.current = true;
    performProgrammaticScroll(false);
  }, [activeConversationId, performProgrammaticScroll]);

  // Keep scroll at bottom on initial message load or when conversation messages update
  useEffect(() => {
    if (!isAutoScrollEnabledRef.current) return;
    performProgrammaticScroll(false);
  }, [activeConversationId, messagesCount, performProgrammaticScroll]);

  // RAF-throttled auto-scroll during active streaming — halts immediately when interrupted
  useEffect(() => {
    // If user has interrupted auto-scroll, do NOT pull down
    if (!isAutoScrollEnabledRef.current) return;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (!isAutoScrollEnabledRef.current) return;
      performProgrammaticScroll(false);
    });

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [streamStepCount, streamContentLength, isLoading, performProgrammaticScroll]);

  return {
    messagesEndRef,
    scrollContainerRef,
    isAutoScrollEnabledRef,
    handleScroll,
    scrollToBottom,
  };
}
