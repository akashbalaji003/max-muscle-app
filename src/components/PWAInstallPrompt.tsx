'use client';
import { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { getGymConfig } from '@/lib/gym-registry';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Props {
  gymSlug: string;
}

export default function PWAInstallPrompt({ gymSlug }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const isInstalled = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  const config = getGymConfig(gymSlug);
  const isAdmin = gymSlug === 'admin';
  const gymName = config?.short_name ?? (isAdmin ? 'GymOS Admin' : gymSlug);
  const dismissKey = `pwa-dismissed-${gymSlug}`;

  useEffect(() => {
    if (!gymSlug) return;

    // Register SW with gym-specific scope so each gym is isolated
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: `/${gymSlug}/` })
        .catch(() => {});
    }

    // Already installed as PWA — don't show prompt
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Dismissed within the last 7 days for THIS gym
    const dismissed = localStorage.getItem(dismissKey);
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // iOS — no beforeinstallprompt; show manual share instructions
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      setTimeout(() => setShow(true), 1500);
      return;
    }

    // Android / Chrome — capture native install event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 1500);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [gymSlug, dismissKey]);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    localStorage.setItem(dismissKey, String(Date.now()));
    setShow(false);
  }

  if (isInstalled || !show || (!config && !isAdmin)) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="mx-auto max-w-sm rounded-2xl border border-violet-500/30 bg-[#0a0a0a]/95 p-4 shadow-[0_8px_40px_rgba(124,58,237,0.25)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          {/* App icon */}
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192x192.png" alt={gymName} className="h-9 w-9 rounded-xl" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">
              Add {gymName} to Home Screen
            </p>
            <p className="text-xs text-slate-400 mt-0.5 leading-tight">
              {isIOS
                ? 'Tap the Share button, then "Add to Home Screen"'
                : 'Install for quick access & a better experience'}
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
