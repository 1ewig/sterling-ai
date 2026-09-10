import React from 'react';

export interface ArgusIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

/**
 * Reusable Argus brand SVG icon.
 * Simple brand icon block with rounded corners.
 */
export function ArgusIcon({
  size,
  className = 'size-4 text-theme-brand-primary',
  ...props
}: ArgusIconProps) {
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
      <rect x="2" y="2" width="20" height="20" rx="4.5" fill="currentColor" />
    </svg>
  );
}
