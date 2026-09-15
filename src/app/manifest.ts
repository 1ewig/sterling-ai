import type { MetadataRoute } from 'next';
import { BRAND_THEME } from '@/constants/theme';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sterling AI Trading Desk',
    short_name: 'Sterling',
    description:
      'Institutional AI Trading Desk & Cross-Asset Intelligence Workbench for continuous crypto and tokenized US equities trading.',
    start_url: '/chat',
    display: 'standalone',
    background_color: BRAND_THEME.BG_HEX,
    theme_color: BRAND_THEME.PRIMARY_HEX,
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
