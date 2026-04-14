import Link from 'next/link';
import { Dumbbell, QrCode, BarChart2, Trophy, Shield, Zap } from 'lucide-react';

const FEATURES = [
  { icon: Dumbbell, title: 'Workout Tracking', desc: 'Log exercises with per-set weight/reps, rest timers, and automatic PR tracking.' },
  { icon: QrCode, title: 'QR Attendance', desc: 'One-tap check-in with automatic membership validation and history.' },
  { icon: BarChart2, title: 'Smart Analytics', desc: 'Streaks, volume charts, body-part distribution and progress over time.' },
  { icon: Trophy, title: 'Leaderboard', desc: "Compete on PRs across every exercise — see where you rank in the gym." },
  { icon: Shield, title: 'Membership Control', desc: 'Admin panel to manage members, renewals, attendance, and access control.' },
  { icon: Zap, title: 'Progress Photos', desc: 'Weekly check-ins with photo uploads and community progress feed.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5 bg-[#000000]/90 backdrop-blur-lg">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-900/40">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 hidden sm:block">
            <span className="text-sm font-extrabold text-white leading-tight block">Max Muscle</span>
            <span className="text-[10px] text-slate-500 leading-tight block">Lifestyle Fitness Studio</span>
          </div>
          <span className="sm:hidden text-base font-extrabold text-white">Max Muscle</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2 min-h-[40px] flex items-center">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-indigo-900/30 min-h-[40px] flex items-center"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-28 pb-16">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1.5 mb-6">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-medium text-indigo-300">Premium Gym Management Platform</span>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-4">
          Maximum Muscle
          <br />
          <span className="gradient-text">Lifestyle Fitness Studio</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-400 max-w-xl mb-8 leading-relaxed">
          Complete gym management — workout logging, QR attendance,
          smart analytics, and competitive leaderboard. All in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-none sm:w-auto">
          <Link
            href="/signup"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all shadow-xl shadow-indigo-900/40 min-h-[52px] flex items-center justify-center"
          >
            Start for Free
          </Link>
          <Link
            href="/admin/login"
            className="bg-[#0f0f0f] hover:bg-[#111111] text-slate-200 font-semibold px-8 py-4 rounded-xl text-lg transition-all border border-indigo-500/20 min-h-[52px] flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" /> Admin Portal
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 w-full">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-white mb-8">Everything your gym needs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card p-5 hover:border-indigo-500/40 transition-colors">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-white mb-1.5">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/5 text-center text-xs text-slate-600 py-5 px-4">
        © {new Date().getFullYear()} Maximum Muscle Lifestyle Fitness Studio
      </footer>
    </div>
  );
}
