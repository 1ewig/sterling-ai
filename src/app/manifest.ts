import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sterling AI Trading Desk',
    short_name: 'Sterling',
    description:
      'Institutional AI Trading Desk & Cross-Asset Intelligence Workbench for continuous crypto and tokenized US equities trading.',
    start_url: '/chat',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#00f0ff',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
