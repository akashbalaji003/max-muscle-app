'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Dumbbell, Phone, Lock, User, ArrowLeft, Ruler, Weight, Target, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const GOALS = [
  { value: 'fat_loss',    label: 'Fat Loss',    desc: 'Burn fat & get lean',    icon: '🔥' },
  { value: 'muscle_gain', label: 'Muscle Gain', desc: 'Build size & strength',   icon: '💪' },
  { value: 'maintenance', label: 'Maintenance', desc: 'Stay fit & healthy',      icon: '⚖️' },
];

export default function GymSignupPage() {
  const params = useParams();
  const gymSlug = params.gymSlug as string;
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

    if (body.height_cm && (isNaN(h) || h < 50 || h > 300)) {
      setError('Enter a valid height (50–300 cm)'); return;
    }
    if (body.weight_kg && (isNaN(w) || w < 20 || w > 500)) {
      setError('Enter a valid weight (20–500 kg)'); return;
    }

    setLoading(true);
    await fetch('/api/body', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        height_cm: body.height_cm ? h : undefined,
        weight_kg: body.weight_kg ? w : undefined,
        goal: body.goal || undefined,
      }),
    });
    setLoading(false);
    router.push(`/${gymSlug}/dashboard`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Back */}
        <div className="mb-6">
          {step === 1 ? (
            <Link href={`/${gymSlug}`} className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors min-h-[44px]">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          ) : (
            <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors min-h-[44px]">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
        </div>

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-red-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-red-900/40">
            <Dumbbell className="w-7 h-7 text-white" />
          </div>
          {step === 1 ? (
            <>
              <h1 className="text-2xl font-extrabold text-white">Create Account</h1>
              <p className="text-sm text-slate-400 mt-1 text-center">Join your fitness community</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold text-white">Your Body Profile</h1>
              <p className="text-sm text-slate-400 mt-1 text-center">Helps us calculate BMI & recommendations</p>
            </>
          )}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2].map((s) => (
              <div key={s} className={`h-1 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-red-600' : s < step ? 'w-4 bg-red-800' : 'w-4 bg-white/10'}`} />
            ))}
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="glass-card p-6 space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">{error}</div>}
            <Input id="name" label="Full Name" type="text" placeholder="John Doe"
              icon={<User className="w-4 h-4" />} value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input id="phone" label="Phone Number" type="tel" placeholder="+91 98765 43210"
              icon={<Phone className="w-4 h-4" />} value={form.phone_number}
              onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))} required />
            <Input id="password" label="Password" type="password" placeholder="Min. 6 characters"
              icon={<Lock className="w-4 h-4" />} value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
            <Input id="confirm" label="Confirm Password" type="password" placeholder="Re-enter password"
              icon={<Lock className="w-4 h-4" />} value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} required />
            <Button type="submit" className="w-full min-h-[48px]" size="lg" loading={loading}>
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          </form>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="glass-card p-6 space-y-5">
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <Input id="height" label="Height (cm)" type="number" placeholder="175"
                icon={<Ruler className="w-4 h-4" />} value={body.height_cm}
                onChange={(e) => setBody((b) => ({ ...b, height_cm: e.target.value }))} />
              <Input id="weight" label="Weight (kg)" type="number" placeholder="70"
                icon={<Weight className="w-4 h-4" />} value={body.weight_kg}
                onChange={(e) => setBody((b) => ({ ...b, weight_kg: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#B3B3B3] mb-2 flex items-center gap-1.5">
                <Target className="w-4 h-4" /> Your Goal
              </label>
              <div className="grid grid-cols-1 gap-2">
                {GOALS.map((g) => (
                  <button key={g.value} type="button" onClick={() => setBody((b) => ({ ...b, goal: g.value }))}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      body.goal === g.value ? 'border-red-600/60 bg-red-700/10 text-white' : 'border-white/10 bg-[#111111] text-slate-400 hover:border-white/20'
                    }`}>
                    <span className="text-xl">{g.icon}</span>
                    <div>
                      <p className="text-sm font-semibold">{g.label}</p>
                      <p className="text-xs opacity-60">{g.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full min-h-[48px]" size="lg" loading={loading}>
              Complete Setup
            </Button>
            <button type="button" onClick={() => router.push(`/${gymSlug}/dashboard`)}
              className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors py-1">
              Skip for now
            </button>
          </form>
        )}

        {step === 1 && (
          <p className="text-center text-sm text-slate-500 mt-5">
            Already a member?{' '}
            <Link href={`/${gymSlug}/login`} className="text-red-400 hover:text-red-300 font-medium">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
