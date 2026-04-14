'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Dumbbell, BarChart2, Trophy, Camera,
  LogOut, QrCode, Menu, X, ChevronLeft,
} from 'lucide-react';
import { useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';

const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Home',     icon: LayoutDashboard },
  { href: '/workout',     label: 'Workout',  icon: Dumbbell },
  { href: '/analytics',   label: 'Stats',    icon: BarChart2 },
  { href: '/leaderboard', label: 'Board',    icon: Trophy },
  { href: '/progress',    label: 'Progress', icon: Camera },
  { href: '/checkin',     label: 'Check-In', icon: QrCode },
];

const PAGE_META: Record<string, { title: string; back?: string }> = {
  '/dashboard':   { title: 'Dashboard' },
  '/workout':     { title: 'Workout Logger', back: '/dashboard' },
  '/analytics':   { title: 'Analytics',      back: '/dashboard' },
  '/leaderboard': { title: 'Leaderboard',    back: '/dashboard' },
  '/progress':    { title: 'Progress Feed',  back: '/dashboard' },
  '/checkin':     { title: 'Check-In',       back: '/dashboard' },
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const meta = PAGE_META[pathname] || { title: 'Max Muscle' };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-red-900/40">
            <Dumbbell className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-display text-xl gradient-text block leading-none tracking-wide">MAX MUSCLE</span>
            <span className="text-[9px] text-slate-600 leading-tight block tracking-widest uppercase mt-0.5">Lifestyle Fitness</span>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-red-700/20 text-red-400 border border-red-600/30 nav-item-active shadow-sm'
                  : 'text-[#B3B3B3] hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0 transition-transform duration-150', active ? 'scale-110' : '')} />
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-white/5 space-y-0.5">
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar-shell hidden lg:flex lg:flex-col lg:w-56 lg:fixed lg:inset-y-0 bg-[#0f0f0f] border-r border-white/5 z-30">
        <NavContent />
      </aside>

      {/* Mobile top header */}
      <div className="mobile-header lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-white/5 flex items-center px-4 gap-2">
        {meta.back ? (
          <button
            onClick={() => router.push(meta.back!)}
            className="p-2 text-slate-400 hover:text-white -ml-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {!meta.back && (
            <div className="w-7 h-7 bg-red-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-3.5 h-3.5 text-white" />
            </div>
          )}
          <span className="font-display text-xl text-white leading-none tracking-wide truncate">{meta.title.toUpperCase()}</span>
        </div>

        <ThemeToggle compact />

        {meta.back && (
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-slate-500 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mobile bottom navigation bar */}
      <nav className="mobile-nav lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f0f0f]/98 backdrop-blur-xl border-t border-white/8 grid grid-cols-6">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-0.5 gap-0.5 min-h-[56px] transition-all',
                active ? 'text-red-400' : 'text-slate-500 active:scale-90'
              )}
            >
              <div className={cn(
                'rounded-xl px-2 py-1 transition-all',
                active ? 'bg-red-600/15 scale-105' : ''
              )}>
                <Icon className="w-[18px] h-[18px]" />
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
          <div className="relative w-64 bg-[#0f0f0f] h-full flex flex-col shadow-2xl slide-up">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white z-10 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
            <NavContent />
          </div>
        </div>
      )}
    </>
  );
}
