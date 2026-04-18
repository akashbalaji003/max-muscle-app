'use client';
import { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Don't show if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Don't show if user already dismissed recently (7 days)
    const dismissed = localStorage.getItem('pwa-dismissed');
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    if (ios) {
      // iOS doesn't fire beforeinstallprompt — show manual instructions
      setTimeout(() => setShow(true), 1500);
      return;
    }

    // Android / Chrome — capture the install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 1500);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShow(false);
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    localStorage.setItem('pwa-dismissed', String(Date.now()));
    setShow(false);
  }

  if (isInstalled || !show) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="mx-auto max-w-sm rounded-2xl border border-violet-500/30 bg-[#0a0a0a]/95 p-4 shadow-[0_8px_40px_rgba(124,58,237,0.25)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          {/* App icon */}
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192x192.png" alt="Max Muscle" className="h-9 w-9 rounded-xl" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">Add Max Muscle to Home Screen</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-tight">
              {isIOS
                ? 'Tap the Share button below, then "Add to Home Screen"'
                : 'Install the app for quick access & a better experience'}
            </p>

            {isIOS ? (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-violet-400">
                <Share className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Tap Share → Add to Home Screen</span>
              </div>
            ) : (
              <button
                onClick={handleInstall}
                className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500 active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                Install App
              </button>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/10 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
