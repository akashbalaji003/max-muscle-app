'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dumbbell, Phone, Lock, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function LoginPage() {
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

    if (!res.ok) {
      setError(data.error || 'Login failed');
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Back to home */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-900/40">
            <Dumbbell className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Welcome back</h1>
          <p className="text-sm text-slate-400 mt-1 text-center">Sign in to Max Muscle Fitness Studio</p>
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
          <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Create account
          </Link>
        </p>
        <p className="text-center text-sm text-slate-600 mt-2">
          <Link href="/admin/login" className="hover:text-slate-400">
            Admin login →
          </Link>
        </p>
      </div>
    </div>
  );
}
