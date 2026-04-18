'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Phone, Lock, User, ArrowLeft, Ruler, Weight, Target, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

const GYM_SLUG = 'maxmuscle';

const GOALS = [
  { value: 'fat_loss',    label: 'Fat Loss',    desc: 'Burn fat & get lean',   icon: '🔥' },
  { value: 'muscle_gain', label: 'Muscle Gain', desc: 'Build size & strength',  icon: '💪' },
  { value: 'maintenance', label: 'Maintenance', desc: 'Stay fit & healthy',     icon: '⚖️' },
];

export default function MaxMuscleSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ name: '', phone_number: '', password: '', confirm: '' });
  const [body, setBody] = useState({ height_cm: '', weight_kg: '', goal: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, phone_number: form.phone_number, password: form.password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'Signup failed'); return; }
    setStep(2);
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!body.goal) { setError('Please select a goal'); return; }
    const h = parseFloat(body.height_cm);
    const w = parseFloat(body.weight_kg);
    if (body.height_cm && (isNaN(h) || h < 50 || h > 300)) { setError('Enter a valid height (50–300 cm)'); return; }
    if (body.weight_kg && (isNaN(w) || w < 20 || w > 500)) { setError('Enter a valid weight (20–500 kg)'); return; }
    setLoading(true);
    await fetch('/api/body', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ height_cm: body.height_cm ? h : undefined, weight_kg: body.weight_kg ? w : undefined, goal: body.goal || undefined }),
    });
    setLoading(false);
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
          {step === 1 ? (
            <Link href={`/${GYM_SLUG}`} className="inline-flex min-h-[44px] items-center gap-2 text-sm text-slate-500 transition-colors hover:text-violet-300">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          ) : (
            <button onClick={() => setStep(1)} className="inline-flex min-h-[44px] items-center gap-2 text-sm text-slate-500 transition-colors hover:text-violet-300">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
        </div>

        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center" style={{ animation: 'icon-glow 3s ease-in-out infinite' }}>
            <Image src="/icon.svg" alt="GymOS" width={48} height={48} className="drop-shadow-[0_0_12px_rgba(124,58,237,0.6)]" />
          </div>
          {step === 1 ? (
            <>
              <h1 className="font-display text-2xl tracking-wide text-white">Create Account</h1>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500 text-center">Join Max Muscle Lifestyle Fitness Studio</p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl tracking-wide text-white">Your Body Profile</h1>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500 text-center">Helps us calculate BMI & smart recommendations</p>
            </>
          )}
          <div className="mt-4 flex items-center gap-2">
            {[1, 2].map((s) => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${s === step ? 'w-10 bg-violet-500' : s < step ? 'w-5 bg-violet-700/60' : 'w-5 bg-white/8'}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div key="step1" style={{ animation: 'step-slide-in 0.45s cubic-bezier(0.22,1,0.36,1) both' }}>
            <form onSubmit={handleStep1} className="rounded-3xl border border-violet-500/10 bg-[#0a0a0a] p-5 shadow-[0_0_60px_rgba(124,58,237,0.06)] sm:p-6 space-y-4">
              {error && <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-sm text-red-400">{error}</div>}
              <Input id="name" label="Full Name" type="text" placeholder="John Doe"
                className="bg-[#000000] border border-white/8 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10 transition-all"
                icon={<User className="w-4 h-4" />} value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Input id="phone" label="Phone Number" type="tel" placeholder="+91 98765 43210"
                className="bg-[#000000] border border-white/8 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10 transition-all"
                icon={<Phone className="w-4 h-4" />} value={form.phone_number}
                onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))} required />
              <Input id="password" label="Password" type="password" placeholder="Min. 6 characters"
                className="bg-[#000000] border border-white/8 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10 transition-all"
                icon={<Lock className="w-4 h-4" />} value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
              <Input id="confirm" label="Confirm Password" type="password" placeholder="Re-enter password"
                className="bg-[#000000] border border-white/8 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10 transition-all"
                icon={<Lock className="w-4 h-4" />} value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} required />
              <Button type="submit" className="btn-shine w-full min-h-[52px] !bg-violet-600 !text-white !shadow-lg !shadow-violet-900/30 hover:!bg-violet-500 hover:!shadow-violet-900/50" size="lg" loading={loading}>
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div key="step2" style={{ animation: 'step-slide-in 0.45s cubic-bezier(0.22,1,0.36,1) both' }}>
            <form onSubmit={handleStep2} className="rounded-3xl border border-violet-500/10 bg-[#0a0a0a] p-5 shadow-[0_0_60px_rgba(124,58,237,0.06)] sm:p-6 space-y-5">
              {error && <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-sm text-red-400">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <Input id="height" label="Height (cm)" type="number" placeholder="175"
                  className="bg-[#000000] border border-white/8 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10 transition-all"
                  icon={<Ruler className="w-4 h-4" />} value={body.height_cm}
                  onChange={(e) => setBody((b) => ({ ...b, height_cm: e.target.value }))} />
                <Input id="weight" label="Weight (kg)" type="number" placeholder="70"
                  className="bg-[#000000] border border-white/8 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10 transition-all"
                  icon={<Weight className="w-4 h-4" />} value={body.weight_kg}
                  onChange={(e) => setBody((b) => ({ ...b, weight_kg: e.target.value }))} />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-500">
                  <Target className="w-4 h-4" /> Your Goal
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {GOALS.map((g) => (
                    <button key={g.value} type="button" onClick={() => setBody((b) => ({ ...b, goal: g.value }))}
                      className={`flex min-h-[56px] items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${body.goal === g.value ? 'border-violet-500/60 bg-violet-500/10 text-white shadow-[0_0_16px_rgba(124,58,237,0.15)]' : 'border-white/10 bg-[#111111] text-slate-400 hover:border-violet-500/20'}`}>
                      <span className="text-xl">{g.icon}</span>
                      <div>
                        <p className="text-sm font-semibold">{g.label}</p>
                        <p className="text-xs opacity-60">{g.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" className="btn-shine w-full min-h-[52px] !bg-violet-600 !text-white !shadow-lg !shadow-violet-900/30 hover:!bg-violet-500 hover:!shadow-violet-900/50" size="lg" loading={loading}>
                Complete Setup
              </Button>
              <button type="button" onClick={() => router.push(`/${GYM_SLUG}/dashboard`)}
                className="w-full py-2 text-sm text-slate-600 transition-colors hover:text-violet-300 min-h-[44px]">
                Skip for now
              </button>
            </form>
          </div>
        )}

        {step === 1 && (
          <p className="mt-5 text-center text-sm text-slate-500">
            Already a member?{' '}
            <Link href={`/${GYM_SLUG}/login`} className="inline-flex min-h-[44px] items-center font-medium text-violet-400 transition-colors hover:text-violet-300">Sign in</Link>
          </p>
        )}
      </div>

      {/* PWA install prompt — slides up from bottom after 1.5s */}
      <PWAInstallPrompt />
    </div>
  );
}
