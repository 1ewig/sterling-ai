import { useState, useEffect } from 'react';

/**
 * Shared high-precision elapsed timer hook for active agent streaming and thinking phases.
 * Guarantees that interval updates only execute while streaming is active,
 * automatically cleaning up timers when work completes to prevent background CPU drain.
 * 
 * @param startedAt - Epoch timestamp in ms when the activity started
 * @param isRunning - Boolean flag indicating if the timer should tick
 * @returns Elapsed time in seconds (minimum 1)
 */
export function useActiveTimer(startedAt?: number, isRunning: boolean = false): number {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    if (!startedAt) return 1;
    return Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
  });

  useEffect(() => {
    if (!isRunning || !startedAt) return;

    const update = () => {
      setElapsedSeconds(Math.max(1, Math.floor((Date.now() - startedAt) / 1000)));
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [isRunning, startedAt]);

  return elapsedSeconds;
}
