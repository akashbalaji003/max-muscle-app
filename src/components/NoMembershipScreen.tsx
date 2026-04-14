'use client';
import { AlertCircle, LogOut, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NoMembershipScreen() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Icon */}
        <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-10 h-10 text-amber-400" />
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-xl font-bold text-white">Membership Not Activated</h1>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            Your account is created. Please contact the gym admin to activate your membership before you can access the app.
          </p>
        </div>

        {/* Steps */}
        <div className="glass-card p-5 text-left space-y-3">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-1">What to do next</p>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-red-700/20 text-red-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
            <p className="text-sm text-slate-300">Visit the gym or contact admin</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-red-700/20 text-red-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
            <p className="text-sm text-slate-300">Admin will add your membership plan</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-red-700/20 text-red-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
            <p className="text-sm text-slate-300">Log out and log back in to access the app</p>
          </div>
        </div>

        {/* Contact hint */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <Phone className="w-3.5 h-3.5" />
          <span>Max Muscle Lifestyle Fitness Studio</span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full h-11 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition-all text-sm border border-slate-700/50"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
