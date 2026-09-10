import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let counter = 0;

/**
 * Generates a unique message ID for chat and stream logs
 */
export function generateMessageId(prefix: string = 'msg'): string {
  counter += 1;
  return `${prefix}_${counter}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Obtains the current epoch timestamp
 */
export function getNowTimestamp(): number {
  return Date.now();
}



