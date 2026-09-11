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
          @keyframes eclipse {
            0% {
              stroke-dasharray: 1 150;
              stroke-dashoffset: 0;
              transform: rotate(-90deg);
            }
            50% {
              stroke-dasharray: 90 150;
              stroke-dashoffset: -35;
              transform: rotate(90deg);
            }
            100% {
              stroke-dasharray: 1 150;
              stroke-dashoffset: -150;
              transform: rotate(270deg);
            }
          }
          .agent-loader-track {
            stroke: var(--theme-border-strong);
            stroke-width: 3.5;
            opacity: 0.25;
          }
          .agent-loader-eclipse {
            stroke: currentColor;
            stroke-width: 4.5;
            stroke-linecap: round;
            transform-origin: center;
            transform: rotate(-90deg);
            animation: eclipse 2.4s ease-in-out infinite;
          }
        `}
      </style>
      <circle cx="32" cy="32" r="24" className={`agent-loader-track ${trackClassName ?? ''}`} />
      <circle
        cx="32"
        cy="32"
        r="24"
        className={`agent-loader-eclipse ${strokeClassName ?? ''}`}
      />
    </svg>
  );
}
