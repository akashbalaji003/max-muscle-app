'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'dark' | 'light';
type Override = Theme | null;   // null = following system

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [override, setOverride] = useState<Override>(null);

  // Init on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme-override') as Theme | null;
    const system = getSystemTheme();
    const resolved = saved ?? system;
    setOverride(saved);
    setTheme(resolved);
    applyTheme(resolved);

    // Keep in sync when system changes (only if user hasn't overridden)
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme-override')) {
        const t: Theme = e.matches ? 'dark' : 'light';
        setTheme(t);
        applyTheme(t);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  function toggle() {
    // Cycle: dark → light → system (clear override) → dark …
    if (override === null) {
      // Currently following system — lock to opposite of current theme
      const next: Theme = theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme-override', next);
      setOverride(next);
      setTheme(next);
      applyTheme(next);
    } else if (override === 'dark') {
      localStorage.setItem('theme-override', 'light');
      setOverride('light');
      setTheme('light');
      applyTheme('light');
    } else {
      // Was light → go back to following system
      localStorage.removeItem('theme-override');
      setOverride(null);
      const sys = getSystemTheme();
      setTheme(sys);
      applyTheme(sys);
    }
  }

  // Label shown in tooltip / full button
  const label =
    override === null
      ? `Auto (${theme === 'dark' ? 'Dark' : 'Light'})`
      : theme === 'dark' ? 'Dark Mode' : 'Light Mode';

  const Icon =
    override === null ? Monitor :
    theme === 'dark'  ? Moon    : Sun;

  if (compact) {
    return (
      <button
        onClick={toggle}
        aria-label={label}
        title={label}
        className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/8 transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all w-full"
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
