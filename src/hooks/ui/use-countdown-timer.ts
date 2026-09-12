'use client';

import { useState, useEffect } from 'react';

export interface CountdownResult {
  countdown: string;
  diffMs: number;
  isSettling: boolean;
}

function calculateCountdown(targetTimestamp?: number): CountdownResult {
  if (!targetTimestamp) {
    return { countdown: '--:--:--', diffMs: 0, isSettling: false };
  }
  const diff = targetTimestamp - Date.now();
  if (diff <= 0) {
    return { countdown: 'Settling', diffMs: 0, isSettling: true };
  }
  const totalSecs = Math.floor(diff / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return { countdown: `${pad(h)}:${pad(m)}:${pad(s)}`, diffMs: diff, isSettling: false };
}

/**
 * Reusable future-target countdown timer hook.
 * Calculates remaining hours, minutes, and seconds until `targetTimestamp`.
 */
export function useCountdownTimer(targetTimestamp?: number): CountdownResult {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!targetTimestamp) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp]);

  return calculateCountdown(targetTimestamp);
}
