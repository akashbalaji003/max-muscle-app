'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Dumbbell, Phone, Lock, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import ZoomLock from '@/components/ZoomLock';
import usePwaMode from '@/components/usePwaMode';
import { storePwaInstallContext } from '@/lib/pwa';

export default function GymLoginPage() {
  const params = useParams();
  const gymSlug = params.gymSlug as string;
  const router = useRouter();
  const isPWA = usePwaMode();

  const [form, setForm] = useState({ phone_number: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    storePwaInstallContext('member', gymSlug);

    let cancelled = false;

    async function checkSession() {
      const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      if (cancelled || !res.ok) return;

      const data = await res.json().catch(() => null);
      if (data?.role === 'admin') {
        router.replace('/admin/dashboard');
        return;
      }
      if (data?.role === 'super_admin') {
        router.replace('/super-admin');
        return;
      }
      if (data?.role === 'user') {
        router.replace(`/${gymSlug}/dashboard`);
      }
    }

    checkSession().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [gymSlug, router]);

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

    if (!res.ok) {
      setError(data.error || 'Login failed');
      return;
    }

    // Check consent
    const consentRes = await fetch('/api/consent/check');
    if (consentRes.ok) {
      const consentData = await consentRes.json();
      if (consentData.needs_consent) {
        router.push(`/consent?next=/${gymSlug}/dashboard`);
        return;
      }
    }

    router.push(`/${gymSlug}/dashboard`);
  }

  return (
    <ZoomLock>
      <div className="main-auth-container min-h-[100dvh] overflow-hidden bg-[#000000] p-4">
        <div className="w-full max-w-sm">
        {/* Back link */}
        <div className="mb-6">
          {!isPWA && (
            <Link
              href={`/${gymSlug}`}
              className="inline-flex min-h-[44px] items-center gap-2 text-sm text-slate-500 transition-colors hover:text-violet-300"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          )}
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-red-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-red-900/40">
            <Dumbbell className="w-7 h-7 text-white" />
          </div>
          <p className="font-display text-[10px] uppercase tracking-[0.35em] text-violet-400">GymOS</p>
          <h1 className="mt-2 text-2xl font-extrabold text-white">Welcome back</h1>
          <p className="text-sm text-slate-400 mt-1 text-center">Sign in to your gym account</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Input
            id="phone"
            label="Phone Number"
            type="tel"
            placeholder="+91 98765 43210"
            icon={<Phone className="w-4 h-4" />}
            value={form.phone_number}
            onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
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
            required
          />

          <Button type="submit" className="w-full min-h-[48px]" size="lg" loading={loading}>
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          New here?{' '}
          <Link href={`/${gymSlug}/signup`} className="text-red-400 hover:text-red-300 font-medium">
            Create account
          </Link>
        </p>
      </div>

        <PWAInstallPrompt gymSlug={gymSlug} />
      </div>
    </ZoomLock>
  );
}
