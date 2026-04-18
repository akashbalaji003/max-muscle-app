'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dumbbell, Phone, Lock, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const GYM_SLUG = 'maxmuscle';

export default function MaxMuscleLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ phone_number: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error || 'Login failed'); return; }

    const consentRes = await fetch('/api/consent/check');
    if (consentRes.ok) {
      const consentData = await consentRes.json();
      if (consentData.needs_consent) {
        router.push(`/consent?next=/${GYM_SLUG}/dashboard`);
        return;
      }
    }

    router.push(`/${GYM_SLUG}/dashboard`);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#000000] p-4">
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
        @keyframes icon-glow-red {
          0%, 100% { box-shadow: 0 0 16px rgba(220,38,38,0.22); }
          50% { box-shadow: 0 0 38px rgba(220,38,38,0.52); }
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
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[160px] h-[160px] sm:w-[360px] sm:h-[360px] bg-red-700/8 rounded-full blur-[60px] sm:blur-[110px]" />
        <div className="fixed bottom-0 right-0 w-[120px] h-[120px] sm:w-[260px] sm:h-[260px] bg-red-900/5 rounded-full blur-[50px] sm:blur-[90px]" />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <Link href={`/${GYM_SLUG}`} className="inline-flex min-h-[44px] items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-300">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>

        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-700 shadow-xl shadow-red-900/50" style={{ animation: 'icon-glow-red 3s ease-in-out infinite' }}>
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-2xl tracking-wide text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-400 text-center">Sign in to Max Muscle Fitness Studio</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 shadow-[0_0_40px_rgba(0,0,0,0.5)] sm:p-6 space-y-4" style={{ animation: 'card-fade-in 0.6s cubic-bezier(0.22,1,0.36,1) both' }}>
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-sm text-red-400">{error}</div>
          )}
          <Input id="phone" label="Phone Number" type="tel" placeholder="+91 98765 43210"
            icon={<Phone className="w-4 h-4" />} value={form.phone_number}
            onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))} required />
          <Input id="password" label="Password" type="password" placeholder="••••••••"
            icon={<Lock className="w-4 h-4" />} value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
          <Button type="submit" className="btn-shine w-full min-h-[52px]" size="lg" loading={loading}>
            Sign In
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          New here?{' '}
          <Link href={`/${GYM_SLUG}/signup`} className="inline-flex min-h-[44px] items-center text-red-400 font-medium transition-colors hover:text-red-300">Create account</Link>
        </p>
      </div>
    </div>
  );
}
