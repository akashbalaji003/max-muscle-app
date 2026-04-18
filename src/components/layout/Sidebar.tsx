'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Dumbbell, BarChart2, Trophy, Users,
  LogOut, QrCode, Menu, ChevronLeft, UserCircle,
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
      <div className="border-b border-white/6 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-400 shadow-[0_0_24px_rgba(124,58,237,0.15)]">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="font-display block text-xl leading-none tracking-wide text-white">MAX MUSCLE</span>
            <span className="mt-0.5 block text-[9px] uppercase tracking-widest text-slate-500 leading-tight">Lifestyle Fitness Studio</span>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'border border-violet-500/20 bg-violet-500/10 text-violet-400 shadow-[0_0_20px_rgba(124,58,237,0.08)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className={cn('h-4 w-4 flex-shrink-0 transition-transform duration-200', active ? 'scale-110' : 'group-hover:scale-110')} />
              {label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="space-y-2 border-t border-white/6 p-3">
        {/* User chip */}
        {me && (
          <Link
            href={gymSlug ? `/${gymSlug}/profile` : '/profile'}
            onClick={() => setMobileOpen(false)}
            className="mb-1 flex items-center gap-2.5 rounded-xl border border-white/6 bg-white/3 px-3 py-2 transition-all duration-200 hover:border-violet-500/15 hover:bg-white/5"
          >
            {me.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatar_url} alt="avatar" className="h-7 w-7 flex-shrink-0 rounded-full object-cover ring-1 ring-violet-500/40" />
            ) : (
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-violet-500/10">
                <span className="text-xs font-bold text-violet-300">
                  {(me.name || me.phone_number || '?').slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}
            <span className="flex-1 truncate text-sm font-medium text-slate-300">
              {me.name || me.phone_number?.slice(-6) || 'My Profile'}
            </span>
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-xl border border-red-500/20 px-3 py-2.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:border-red-400/25 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="w-4 h-4" /> Logout
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
      <div className="mobile-header lg:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-2 border-b border-white/6 bg-[#0a0a0a]/95 px-4 backdrop-blur-xl">
        {meta.back ? (
          <button
            onClick={() => router.push(meta.back!)}
            className="-ml-1 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-slate-400 transition-all duration-200 hover:bg-white/5 hover:text-white"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => setMobileOpen(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-slate-400 transition-all duration-200 hover:bg-white/5 hover:text-white"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex min-w-0 flex-1 items-center gap-2">
          {!meta.back && (
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
              <Dumbbell className="h-3.5 w-3.5" />
            </div>
          )}
          <span className="font-display truncate text-xl leading-none tracking-wide text-white">{meta.title.toUpperCase()}</span>
        </div>

        {meta.back && (
          <button
            onClick={() => setMobileOpen(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-slate-500 transition-all duration-200 hover:bg-white/5 hover:text-white"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mobile bottom navigation bar */}
      <nav className="mobile-nav lg:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-white/6 bg-[#0a0a0a]/98 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-h-[56px] min-w-[56px] flex-col items-center justify-center gap-0.5 px-0.5 py-2 transition-all duration-200',
                active ? 'text-violet-400' : 'text-slate-500 active:scale-90'
              )}
            >
              <div className={cn(
                'rounded-xl px-2 py-1 transition-all duration-200',
                active ? 'bg-violet-500/10 scale-105 shadow-[0_0_20px_rgba(124,58,237,0.10)]' : ''
              )}>
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <span className="text-[9px] font-medium leading-tight">{label}</span>
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
