'use client';

/**
 * ThemeProvider — Dark mode only.
 * Always forces dark theme. Clears any previously stored light-mode override.
 * setTheme / toggle are kept as no-ops for API compatibility.
 */

import { createContext, useContext, useEffect, type ReactNode } from 'react';

type Theme = 'dark';

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'dark',
  setTheme: () => {},
  toggle:   () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Enforce dark permanently — remove any stored light override
    document.documentElement.setAttribute('data-theme', 'dark');
    try { localStorage.removeItem('theme-override'); } catch (_) {}
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'dark', setTheme: () => {}, toggle: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Consume in any client component */
export const useTheme = () => useContext(ThemeContext);
