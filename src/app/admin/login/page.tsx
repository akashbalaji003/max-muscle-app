'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Lock, ArrowLeft } from 'lucide-react';
import Input from '@/components/ui/Input';
import usePwaMode from '@/components/usePwaMode';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

export default function AdminLoginPage() {
  const router = useRouter();
  const isPWA = usePwaMode();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      if (cancelled || !res.ok) return;

      const data = await res.json().catch(() => null);
      if (data?.role === 'user') {
        router.replace('/dashboard');
        return;
      }
      if (data?.role === 'super_admin') {
        router.replace('/super-admin');
        return;
      }
      if (data?.role === 'admin') {
        router.replace('/admin/dashboard');
      }
    }

    checkSession().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Login failed');
      return;
    }

    // Check if admin needs to accept the latest terms
    const consentRes = await fetch('/api/consent/check');
    if (consentRes.ok) {
      const consentData = await consentRes.json();
      if (consentData.needs_consent) {
        router.push('/consent?next=/admin/dashboard');
        return;
      }
    }

    router.push('/admin/dashboard');
  }

  return (
    <div className="main-auth-container relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#000000] p-4">
      <style>{`
        @keyframes card-fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes icon-glow {
          0%, 100% { box-shadow: 0 0 16px rgba(124,58,237,0.22); }
          50% { box-shadow: 0 0 38px rgba(99,102,241,0.5); }
        }
        @keyframes orb-drift {
          0%, 100% { transform: translate(0,0) scale(1); opacity: 0.4; }
          50% { transform: translate(-10px, 8px) scale(1.04); opacity: 0.55; }
        }
        @keyframes shine-sweep {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(250%) skewX(-12deg); }
        }
        @keyframes step-slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .btn-shine { position: relative; overflow: hidden; }
        .btn-shine::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
          transform: translateX(-100%) skewX(-12deg);
          pointer-events: none;
        }
        @media (hover: hover) {
          .btn-shine:hover::after {
            animation: shine-sweep 0.5s cubic-bezier(0.22,1,0.36,1) forwards;
          }
        }
        .scroll-reveal {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1),
                      transform 0.65s cubic-bezier(0.22,1,0.36,1);
        }
        .scroll-reveal.visible { opacity: 1; transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
          .scroll-reveal { opacity: 1 !important; transform: none !important; }
        }
      `}</style>
      <div aria-hidden="true" className="pointer-events-none">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[160px] h-[160px] sm:w-[360px] sm:h-[360px] bg-violet-600/8 rounded-full blur-[60px] sm:blur-[110px]" />
        <div className="fixed bottom-0 right-0 w-[120px] h-[120px] sm:w-[260px] sm:h-[260px] bg-indigo-700/6 rounded-full blur-[50px] sm:blur-[90px]" />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6">
          {!isPWA && (
            <Link
              href="/maxmuscle"
              className="inline-flex min-h-[44px] items-center gap-2 text-sm text-slate-500 transition-colors hover:text-violet-300"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          )}
        </div>

        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center" style={{ animation: 'icon-glow 3s ease-in-out infinite' }}>
            <Image src="/icon.svg" alt="GymOS" width={48} height={48} className="drop-shadow-[0_0_12px_rgba(124,58,237,0.6)]" />
          </div>
          <p className="font-display text-[10px] uppercase tracking-[0.35em] text-violet-400">GymOS</p>
          <h1 className="mt-2 font-display text-2xl tracking-wide text-white">Welcome Back</h1>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500 text-center">Platform administrators only</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-violet-500/10 bg-[#0a0a0a] p-5 shadow-[0_0_60px_rgba(124,58,237,0.06)] sm:p-6 space-y-4" style={{ animation: 'card-fade-in 0.6s cubic-bezier(0.22,1,0.36,1) both' }}>
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Input
            id="username"
            label="Username"
            type="text"
            placeholder="admin"
            icon={<User className="w-4 h-4" />}
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            className="bg-[#000000] border border-white/8 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10 transition-all"
            required
          />

          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock className="w-4 h-4" />}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="bg-[#000000] border border-white/8 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10 transition-all"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="btn-shine flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-violet-600 text-white font-display tracking-wide transition-all shadow-lg shadow-violet-900/30 hover:bg-violet-500 hover:shadow-violet-900/50 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            {loading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Access Admin Panel
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          <Link href="/maxmuscle/login" className="inline-flex min-h-[44px] items-center justify-center transition-colors hover:text-violet-300">
            ← Member login
          </Link>
        </p>
        <PWAInstallPrompt gymSlug="admin" />
      </div>
    </div>
  );
}
