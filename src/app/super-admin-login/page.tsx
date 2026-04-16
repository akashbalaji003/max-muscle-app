'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff } from 'lucide-react';
import GymOSLoader from '@/components/GymOSLoader';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Loader state
  const [showLoader, setShowLoader] = useState(false);

  // Coordinate loader + API response — avoid stale closures with refs
  const resolvedRef = useRef({ loaderDone: false, apiDone: false, success: false });

  function checkTransition() {
    const r = resolvedRef.current;
    if (!r.loaderDone || !r.apiDone) return; // wait for both
    if (r.success) {
      router.push('/super-admin');
    } else {
      // Show error — loader hides, form reappears
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

    // Reset coordination state
    resolvedRef.current = { loaderDone: false, apiDone: false, success: false };
    setShowLoader(true); // show loader immediately

    // API call runs in parallel — do NOT await loader
    try {
      const res = await fetch('/api/super-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        // API failed — record error, wait for loader to finish before revealing it
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

  // Show loader overlay (3.5s animation, then transition)
  if (showLoader) {
    return <GymOSLoader duration={3500} onComplete={handleLoaderComplete} />;
  }

  // ── Login form ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-violet-700/30 border border-violet-500/30 flex items-center justify-center mb-4">
            <Shield className="w-7 h-7 text-violet-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Platform Owner Access</h1>
          <p className="text-xs text-slate-500 mt-1">Super Admin — GymOS</p>
        </div>

        {/* Card */}
        <div className="bg-[#0f0f0f] border border-white/8 rounded-2xl p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Username</label>
              <input
                type="text"
                autoComplete="username"
                placeholder="super admin username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                required
                className="w-full bg-[#000000] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  className="w-full bg-[#000000] border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-violet-700 hover:bg-violet-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center text-sm mt-2"
            >
              Sign In
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-700 mt-5">
          This login is for platform administrators only.
        </p>
      </div>
    </div>
  );
}
