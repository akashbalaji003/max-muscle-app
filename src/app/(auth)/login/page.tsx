'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import GymOSLoader from '@/components/GymOSLoader';

export default function PlatformLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Loader state
  const [showLoader, setShowLoader] = useState(false);
  const resolvedRef = useRef({ loaderDone: false, apiDone: false, success: false });

  function checkTransition() {
    const r = resolvedRef.current;
    if (!r.loaderDone || !r.apiDone) return;
    if (r.success) {
      router.push('/super-admin');
    } else {
      setShowLoader(false);
    }
  }

  function handleLoaderComplete() {
    resolvedRef.current.loaderDone = true;
    checkTransition();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    resolvedRef.current = { loaderDone: false, apiDone: false, success: false };
    setShowLoader(true);

    try {
      const res = await fetch('/api/super-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        resolvedRef.current.success = false;
        setError(data.error || 'Login failed');
      } else {
        resolvedRef.current.success = true;
      }
    } catch {
      resolvedRef.current.success = false;
      setError('Network error. Please try again.');
    }

    resolvedRef.current.apiDone = true;
    checkTransition();
  }

  if (showLoader) {
    return <GymOSLoader duration={3500} onComplete={handleLoaderComplete} />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#000000] px-4 py-8 text-white">
      <style>{`
        @keyframes icon-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.25); }
          50% { box-shadow: 0 0 45px rgba(124,58,237,0.55); }
        }

        @keyframes card-fade-in {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shine-sweep {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(250%) skewX(-15deg); }
        }

        .login-card {
          animation: card-fade-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .btn-shine {
          position: relative;
          overflow: hidden;
        }

        .btn-shine::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
          transform: translateX(-100%) skewX(-15deg);
          pointer-events: none;
        }

        .btn-shine:hover::after {
          animation: shine-sweep 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[420px] w-[420px] rounded-full bg-indigo-700/6 blur-[120px]" />
        <div className="absolute left-[-120px] top-1/2 h-[360px] w-[360px] rounded-full bg-purple-800/5 blur-[110px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-sm flex-col justify-center">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to GymOS
          </Link>
        </div>

        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10"
            style={{ animation: 'icon-glow 3s ease-in-out infinite' }}
          >
            <Zap className="h-8 w-8 text-violet-400" />
          </div>
          <h1 className="font-display text-2xl tracking-wide text-white sm:text-[2rem]">
            GymOS Platform Login
          </h1>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">
            Platform administrators only
          </p>
        </div>

        <div className="mb-6 h-px w-full bg-violet-500/15" />

        <div className="login-card rounded-3xl border border-violet-500/10 bg-[#0a0a0a] p-8 shadow-[0_0_60px_rgba(124,58,237,0.06)]">
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-slate-500">Username</label>
              <input
                type="text"
                autoComplete="username"
                placeholder="Platform username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                required
                className="w-full rounded-xl border border-white/8 bg-[#000000] px-4 py-3 text-sm text-slate-100 placeholder-slate-600 transition-all focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-slate-500">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-white/8 bg-[#000000] px-4 py-3 pr-10 text-sm text-slate-100 placeholder-slate-600 transition-all focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-shine flex h-12 w-full items-center justify-center rounded-xl bg-violet-600 text-sm font-display tracking-wide text-white shadow-lg shadow-violet-900/30 transition-all hover:bg-violet-500 hover:shadow-violet-900/50"
            >
              Sign In
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-wider text-slate-700">
          This login is for platform administrators only.
        </p>
      </div>
    </div>
  );
}
