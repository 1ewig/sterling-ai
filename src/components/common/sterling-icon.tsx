import React from 'react';

export interface SterlingIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

/**
 * Reusable Sterling brand SVG icon.
 * Simple brand icon block with rounded corners.
 */
export function SterlingIcon({
  size,
  className = 'size-4 text-theme-brand-primary',
  ...props
}: SterlingIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="4.5" stroke="currentColor" strokeWidth="2" />
      <rect x="8" y="8" width="8" height="8" rx="2" fill="currentColor" />
    </svg>
  );
}

// Backward-compatible alias
export const ArgusIcon = SterlingIcon;
export type ArgusIconProps = SterlingIconProps;
