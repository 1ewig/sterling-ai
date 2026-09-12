import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { LeftSidebar } from "@/components/left-sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark light",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://sterling-desk.vercel.app"
  ),
  title: {
    default: "Sterling — Institutional AI Trading Desk & Cross-Asset Intelligence Workbench",
    template: "%s | Sterling AI Desk",
  },
  description:
    "Institutional-grade AI Trading Desk engineered for 24/7 continuous market perception, sub-50ms Bitget Unified V3 WebSocket streaming, L2 order book depth, 23 pure TypeScript quantitative indicators, and staged trade execution.",
  applicationName: "Sterling Trading Desk",
  authors: [{ name: "Sterling Intelligence Desk" }],
  generator: "Next.js",
  keywords: [
    "AI Trading Desk",
    "Quantitative Trading",
    "Crypto Market Streamer",
    "Bitget V3 WebSocket",
    "Tokenized Equities",
    "rTokens",
    "L2 Order Book",
    "DeFi TVL Intelligence",
    "DeFiLlama On-Chain",
    "Technical Indicator Engine",
    "Institutional Trading",
    "Autonomous Agent Desk",
  ],
  creator: "Sterling Desk",
  publisher: "Sterling Desk",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Sterling AI Trading Desk",
    title: "Sterling — Institutional AI Trading Desk & Cross-Asset Intelligence Workbench",
    description:
      "Autonomous 24/7 AI trading workbench with sub-50ms Bitget V3 WebSocket streaming, L2 order books, quantitative indicators, and staged trade execution.",
    images: [
      {
        url: "/icon.svg",
        width: 512,
        height: 512,
        alt: "Sterling Institutional AI Trading Desk",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sterling — Institutional AI Trading Desk & Cross-Asset Intelligence Workbench",
    description:
      "Autonomous 24/7 AI trading workbench with sub-50ms Bitget V3 WebSocket streaming, L2 order books, quantitative indicators, and staged trade execution.",
    images: ["/icon.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon.svg" },
    ],
  },
  category: "finance",
};

const PRE_HYDRATION_SCRIPT = `
(function() {
  try {
    var storedTheme = localStorage.getItem('sterling-theme');
    var theme = storedTheme === 'light' ? 'light' : 'dark';
    document.documentElement.classList.add(theme);

    var storedSidebar = localStorage.getItem('sterling-sidebar-collapsed');
    if (storedSidebar === 'true') {
      document.documentElement.classList.add('sidebar-collapsed');
    }
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} font-sans h-full h-dvh antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PRE_HYDRATION_SCRIPT }} />
      </head>
      <body className="h-full h-dvh bg-theme-bg-base flex flex-row overflow-hidden">
        <LeftSidebar />
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
