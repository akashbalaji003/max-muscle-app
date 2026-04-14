import type { Metadata } from "next";
import "./globals.css";
import MouseGlow from "@/components/MouseGlow";
import NavigationProgress from "@/components/NavigationProgress";

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

const themeScript = `
(function(){
  try {
    var saved = localStorage.getItem('theme-override');
    var theme = saved
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch(e){}
})();
`.trim();

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
        <NavigationProgress />
        <MouseGlow />
        {children}
      </body>
    </html>
  );
}
