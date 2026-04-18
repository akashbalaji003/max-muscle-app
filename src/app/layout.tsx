import type { Metadata } from "next";
import "./globals.css";
import MouseGlow from "@/components/MouseGlow";
import NavigationProgress from "@/components/NavigationProgress";
import { ThemeProvider } from "@/components/ThemeProvider";
import NoContextMenu from "@/components/NoContextMenu";

export const metadata: Metadata = {
  title: "GymOS",
  description: "The gym management platform built for modern fitness businesses. Memberships, check-ins, workouts, and analytics — all in one place.",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192x192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512x512.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon-192x192.png',
  },
};

// Always dark — clears any stored light override before hydration
const themeScript = `(function(){try{localStorage.removeItem('theme-override');document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className="antialiased"
      suppressHydrationWarning
    >
      <head>
        {/* Clash Display — Fontshare CDN */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <NoContextMenu />
        <NavigationProgress />
        <MouseGlow />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
