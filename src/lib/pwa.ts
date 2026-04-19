export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;

  const nav = window.navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  );
}

export type PwaEntryType = 'member' | 'admin';

const PWA_ENTRY_KEY = 'pwaEntry';
const PWA_GYM_KEY = 'gymSlug';

export function storePwaInstallContext(entry: PwaEntryType, gymSlug?: string | null) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(PWA_ENTRY_KEY, entry);
  if (gymSlug) {
    window.localStorage.setItem(PWA_GYM_KEY, gymSlug);
  }
}

export function readPwaInstallContext(): { entry: PwaEntryType | null; gymSlug: string | null } {
  if (typeof window === 'undefined') {
    return { entry: null, gymSlug: null };
  }

  const entry = window.localStorage.getItem(PWA_ENTRY_KEY);
  const gymSlug = window.localStorage.getItem(PWA_GYM_KEY);

  return {
    entry: entry === 'member' || entry === 'admin' ? entry : null,
    gymSlug,
  };
}
