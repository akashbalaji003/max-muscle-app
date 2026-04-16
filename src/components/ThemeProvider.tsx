'use client';

/**
 * ThemeProvider
 * ─────────────
 * • Reads the theme that the inline <script> already stamped onto
 *   document.documentElement before React hydrated — no flash.
 * • Exposes { theme, setTheme, toggle } via context.
 * • Listens for OS-level prefers-color-scheme changes and applies
 *   them instantly if the user has not pinned a manual override.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type Theme = 'dark' | 'light';

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'dark',
  setTheme: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialise from what the inline script already applied — zero FOUC
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (document.documentElement.getAttribute('data-theme') as Theme) ?? 'dark';
  });

  // ── Apply to DOM + persist ────────────────────────────────────────────────
  const applyTheme = (t: Theme, persist = true) => {
    document.documentElement.setAttribute('data-theme', t);
    if (persist) {
      try { localStorage.setItem('theme-override', t); } catch (_) {}
    }
    setThemeState(t);
  };

  const setTheme = (t: Theme) => applyTheme(t, true);
  const toggle   = ()         => applyTheme(theme === 'dark' ? 'light' : 'dark', true);

  // ── System-preference change listener ────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // Only follow system if the user has NOT pinned a manual override
      try {
        if (localStorage.getItem('theme-override')) return;
      } catch (_) {}
      applyTheme(e.matches ? 'dark' : 'light', false); // don't persist — keep following system
    };

    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Consume in any client component */
export const useTheme = () => useContext(ThemeContext);
