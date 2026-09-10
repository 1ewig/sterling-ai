'use client';

import React from 'react';

export interface AgentLoaderProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  trackClassName?: string;
  strokeClassName?: string;
}

/**
 * Reusable morphing spinner loader component.
 * Features an organic morphing stroke animation that rotates smoothly.
 * Adheres to theme token standards using currentColor and theme CSS variables.
 */
export function AgentLoader({
  className = 'size-4 text-theme-brand-primary',
  trackClassName,
  strokeClassName,
  ...props
}: AgentLoaderProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <style>
        {`
          @keyframes sterling-spin {
            to { transform: rotate(360deg); }
          }
          @keyframes sterling-morph {
            0%, 25% { stroke-dasharray: 0.1 15; stroke-dashoffset: 0; }
            50%, 75% { stroke-dasharray: 48 160; stroke-dashoffset: -12; }
            100% { stroke-dasharray: 0.1 15; stroke-dashoffset: 0; }
          }
          .sterling-loader-track {
            stroke: var(--theme-border-strong);
            stroke-width: 2.5;
            opacity: 0.35;
          }
          .sterling-loader-spinner {
            transform-origin: center;
            animation: sterling-spin 3s linear infinite;
          }
          .sterling-loader-stroke {
            stroke: currentColor;
            stroke-width: 4;
            stroke-linecap: round;
            animation: sterling-morph 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
        `}
      </style>
      <circle cx="32" cy="32" r="24" className={`sterling-loader-track ${trackClassName ?? ''}`} />
      <g className="sterling-loader-spinner">
        <circle
          cx="32"
          cy="32"
          r="24"
          className={`sterling-loader-stroke ${strokeClassName ?? ''}`}
          strokeDasharray="0.1 15"
        />
      </g>
    </svg>
  );
}
