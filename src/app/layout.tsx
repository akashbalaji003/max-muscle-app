import type { Metadata } from "next";
import "./globals.css";
import MouseGlow from "@/components/MouseGlow";
import NavigationProgress from "@/components/NavigationProgress";
import { ThemeProvider } from "@/components/ThemeProvider";
import NoContextMenu from "@/components/NoContextMenu";

export const metadata: Metadata = {
  title: "Maximum Muscle Lifestyle Fitness Studio",
  description: "Premium unisex gym — workout tracking, QR attendance & smart analytics. Join Max Muscle Lifestyle Fitness Studio.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
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
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
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
