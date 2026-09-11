import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Sterling — AI Trading Desk & Cross-Asset Intelligence Workbench",
  description: "High-performance AI Trading Desk for 24/7 continuous crypto and tokenized US equities trading.",
  icons: {
    icon: "/icon.svg",
  },
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
