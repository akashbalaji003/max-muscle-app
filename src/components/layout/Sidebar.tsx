'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Dumbbell, BarChart2, Trophy, Users,
  LogOut, QrCode, Menu, UserCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

// Protected route segments (must match [gymSlug]/(protected)/* folder names)
const GYM_ROUTE_SEGMENTS = new Set([
  'dashboard', 'workout', 'analytics', 'leaderboard',
  'progress', 'checkin', 'profile', 'social',
]);

/**
 * Extract gymSlug from the current pathname.
 * - /maxmuscle/dashboard  → 'maxmuscle'
 * - /dashboard            → null  (legacy route, no prefix)
 */
function useGymSlug(): string | null {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  // e.g. ['maxmuscle', 'dashboard'] — first segment is slug if second is a known gym route
  if (segments.length >= 2 && GYM_ROUTE_SEGMENTS.has(segments[1])) {
    return segments[0];
  }
  return null;
}

const NAV_BASE = [
  { path: '/dashboard',   label: 'Home',     icon: LayoutDashboard },
  { path: '/workout',     label: 'Workout',  icon: Dumbbell },
  { path: '/analytics',   label: 'Stats',    icon: BarChart2 },
  { path: '/leaderboard', label: 'Board',    icon: Trophy },
  { path: '/progress',    label: 'Social',   icon: Users },
  { path: '/checkin',     label: 'Check-In', icon: QrCode },
  { path: '/profile',     label: 'Profile',  icon: UserCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const gymSlug = useGymSlug();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<{ name?: string | null; avatar_url?: string | null; phone_number?: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d?.user && setMe(d.user))
      .catch(() => null);
  }, []);

  // Prefix nav items with /${gymSlug} when in a gym-scoped route
  const NAV_ITEMS = NAV_BASE.map(({ path, label, icon }) => ({
    href: gymSlug ? `/${gymSlug}${path}` : path,
    label,
    icon,
  }));
  const MOBILE_NAV_ITEMS = NAV_ITEMS.filter(({ label }) => ['Home', 'Workout', 'Board', 'Social', 'Profile'].includes(label));

  // Page meta for mobile header — keyed by base path (without gymSlug prefix)
  const basePath = gymSlug
    ? pathname.replace(`/${gymSlug}`, '')
    : pathname;

  const PAGE_META: Record<string, { title: string; back?: string }> = {
    '/dashboard':   { title: 'Dashboard' },
    '/workout':     { title: 'Workout Logger', back: gymSlug ? `/${gymSlug}/dashboard` : '/dashboard' },
    '/analytics':   { title: 'Analytics',      back: gymSlug ? `/${gymSlug}/dashboard` : '/dashboard' },
    '/leaderboard': { title: 'Leaderboard',    back: gymSlug ? `/${gymSlug}/dashboard` : '/dashboard' },
    '/progress':    { title: 'Social Feed',    back: gymSlug ? `/${gymSlug}/dashboard` : '/dashboard' },
    '/checkin':     { title: 'Check-In',       back: gymSlug ? `/${gymSlug}/dashboard` : '/dashboard' },
    '/profile':     { title: 'Profile',        back: gymSlug ? `/${gymSlug}/dashboard` : '/dashboard' },
  };

  const meta = PAGE_META[basePath] || { title: 'Max Muscle' };

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    // Go to gym homepage if we have a slug, otherwise GymOS root
    router.push(gymSlug ? `/${gymSlug}` : '/');
  }

  const navContent = (
    <div className="flex h-full flex-col bg-[#0a0a0a] text-white">
      {/* Logo */}
      <div className="border-b border-white/6 bg-gradient-to-br from-violet-500/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/15 text-violet-300 shadow-[0_0_30px_rgba(124,58,237,0.18)]">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="font-display block text-lg leading-tight tracking-wide text-white">MAX MUSCLE</span>
            <span className="mt-0.5 block text-[8px] uppercase tracking-widest text-slate-600 leading-tight font-medium">Lifestyle Fitness</span>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200',
                active
                  ? 'border-l-2 border-l-violet-500 bg-violet-500/10 text-violet-400 shadow-[0_0_30px_rgba(124,58,237,0.12)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0 transition-all duration-200', active ? 'text-violet-400' : 'group-hover:text-slate-300')} />
              <span className="flex-1">{label}</span>
              {active && <span className="h-2 w-2 rounded-full bg-violet-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="space-y-2 border-t border-white/6 bg-gradient-to-t from-violet-500/3 to-transparent p-3">
        {/* User chip */}
        {me && (
          <Link
            href={gymSlug ? `/${gymSlug}/profile` : '/profile'}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2 transition-all duration-200 hover:border-violet-500/30 hover:bg-violet-500/10 hover:shadow-[0_0_24px_rgba(124,58,237,0.10)]"
          >
            {me.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatar_url} alt="avatar" className="h-7 w-7 flex-shrink-0 rounded-full object-cover ring-2 ring-violet-500/40" />
            ) : (
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-violet-600 font-display">
                <span className="text-xs font-bold text-white">
                  {(me.name || me.phone_number || '?').slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}
            <span className="flex-1 truncate text-xs sm:text-sm font-medium text-slate-200">
              {me.name || me.phone_number?.slice(-6) || 'Profile'}
            </span>
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 px-3 py-2 text-xs sm:text-sm font-medium text-red-400 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar-shell hidden lg:flex lg:fixed lg:inset-y-0 lg:w-56 lg:flex-col bg-[#0a0a0a]/95 border-r border-white/6 z-30 backdrop-blur-xl shadow-[0_0_80px_rgba(0,0,0,0.35)]">
        {navContent}
      </aside>

      {/* Mobile top header */}
      <div className="mobile-header lg:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 border-b border-white/6 bg-[#0a0a0a]/95 px-4 backdrop-blur-xl">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-slate-400 transition-all duration-200 hover:bg-white/5 hover:text-white"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <Dumbbell className="h-3.5 w-3.5" />
          </div>
          <span className="font-display truncate text-lg leading-none tracking-wide text-white">{meta.title.toUpperCase()}</span>
        </div>
      </div>

      {/* Mobile bottom navigation bar */}
      <nav className="mobile-nav lg:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-white/6 bg-[#0a0a0a]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-h-[60px] min-w-[52px] flex-col items-center justify-center gap-1 px-1 py-2 transition-all duration-200',
                active ? 'text-violet-400' : 'text-slate-500 active:scale-95'
              )}
            >
              <div className={cn(
                'flex items-center justify-center rounded-xl p-2 transition-all duration-200',
                active
                  ? 'bg-violet-600/20 shadow-[0_0_24px_rgba(124,58,237,0.15)] scale-105'
                  : 'group-hover:bg-white/5'
              )}>
                <Icon className={cn('h-5 w-5 transition-all duration-200', active ? 'text-violet-400' : 'text-slate-400')} />
              </div>
              <span className={cn('text-[10px] font-medium leading-tight transition-all duration-200', active ? 'text-violet-400' : 'text-slate-500')}>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile overlay / slide-out menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex h-full w-64 flex-col bg-[#0a0a0a] shadow-2xl slide-up">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
