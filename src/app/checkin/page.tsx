'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader, QrCode, ArrowLeft, Dumbbell } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

type Status = 'idle' | 'loading' | 'success' | 'already' | 'error' | 'unauthorized' | 'expired';

/** Format: "15 April 2026" */
function formatDateLarge(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Format: "7:42 AM" */
function formatTimeFmt(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function CheckInPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [memberDays, setMemberDays] = useState<number | null>(null);
  const [checkinTime, setCheckinTime] = useState('');
  const [checkinDate, setCheckinDate] = useState('');

  useEffect(() => {
    async function init() {
      const meRes = await fetch('/api/auth/me');
      if (meRes.status === 401) { setStatus('unauthorized'); return; }
      const meData = await meRes.json();
      setUserName(meData.user?.name || meData.user?.phone_number || '');
      if (meData.membership?.end_date) {
        const end = new Date(meData.membership.end_date);
        const diff = Math.max(0, Math.floor((end.getTime() - Date.now()) / 86400000));
        setMemberDays(diff);
      }

      const attRes = await fetch('/api/attendance/history?limit=1');
      if (attRes.ok) {
        const attData = await attRes.json();
        const today = new Date().toISOString().split('T')[0];
        const record = attData.attendance?.[0];
        if (record?.date === today) {
          const ts = new Date(record.checked_in_at);
          setCheckinTime(formatTimeFmt(ts));
          setCheckinDate(formatDateLarge(ts));
          setStatus('already');
        }
      }
    }
    init();
  }, []);

  async function handleCheckIn() {
    setStatus('loading');
    const res = await fetch('/api/attendance/checkin', { method: 'POST' });
    const data = await res.json();

    if (res.status === 401) { setStatus('unauthorized'); return; }
    if (res.status === 409) {
      const ts = data.checked_in_at ? new Date(data.checked_in_at) : new Date();
      setCheckinTime(formatTimeFmt(ts));
      setCheckinDate(formatDateLarge(ts));
      setStatus('already');
      setMessage(data.error);
      return;
    }
    if (res.status === 403) { setStatus('expired'); setMessage(data.error); return; }
    if (!res.ok) { setStatus('error'); setMessage(data.error || 'Check-in failed'); return; }

    const ts = data.attendance?.checked_in_at ? new Date(data.attendance.checked_in_at) : new Date();
    setCheckinTime(formatTimeFmt(ts));
    setCheckinDate(formatDateLarge(ts));
    setStatus('success');
    setMessage(data.message);
  }

  const todayDisplay = formatDateLarge(new Date());

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/3 w-64 h-64 bg-red-700/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative">
        {/* Back link */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
        </div>

        {/* Gym logo — Max Muscle branding */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 bg-red-700 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/40">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <span className="text-xl font-bold gradient-text block leading-none">MAX MUSCLE</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Check-In</span>
          </div>
        </div>

        {/* ── Idle state ── */}
        {status === 'idle' && (
          <div className="glass-card p-8 text-center">
            {userName && (
              <p className="text-slate-400 text-sm mb-6">
                Welcome, <span className="text-white font-semibold">{userName}</span>
                {memberDays !== null && (
                  <span className="text-xs text-slate-500 ml-1">· {memberDays}d left</span>
                )}
              </p>
            )}
            <div className="relative flex items-center justify-center mb-8">
              <div className="pulse-ring w-24 h-24 rounded-full bg-red-700/10 flex items-center justify-center">
                <QrCode className="w-12 h-12 text-red-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Max Muscle Check-In</h1>
            <p className="text-slate-400 text-sm mb-8">Tap below to record your attendance for today.</p>
            <Button onClick={handleCheckIn} size="lg" className="w-full text-base min-h-[52px]">
              Check In Now
            </Button>
            <p className="text-xs text-slate-600 mt-4">{todayDisplay}</p>
          </div>
        )}

        {/* ── Loading state ── */}
        {status === 'loading' && (
          <div className="glass-card p-12 flex flex-col items-center gap-4">
            <Loader className="w-10 h-10 text-red-400 animate-spin" />
            <p className="text-slate-300 text-sm">Processing check-in...</p>
          </div>
        )}

        {/* ── Success state ── */}
        {status === 'success' && (
          <div className="glass-card p-8 text-center border border-emerald-500/30">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>

            {/* Gym name */}
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
              Max Muscle Check-In
            </p>

            {/* Large date */}
            <p className="font-display text-4xl sm:text-5xl text-white leading-none mb-2">
              {checkinDate}
            </p>

            {/* Time */}
            <p className="text-xl text-emerald-400 font-semibold mb-6">{checkinTime}</p>

            <p className="text-emerald-300 text-sm font-medium mb-8">
              ✅ Checked In — Have a great workout!
            </p>

            <div className="space-y-3">
              <Link href="/workout">
                <Button className="w-full min-h-[48px]" size="lg">Start Workout</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" className="w-full min-h-[48px]">Dashboard</Button>
              </Link>
            </div>
          </div>
        )}

        {/* ── Already checked in ── */}
        {status === 'already' && (
          <div className="glass-card p-8 text-center border border-red-600/30">
            <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-red-400" />
            </div>

            {/* Gym name */}
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
              Max Muscle Check-In
            </p>

            {/* Large date */}
            <p className="font-display text-4xl sm:text-5xl text-white leading-none mb-2">
              {checkinDate || todayDisplay}
            </p>

            {/* Time */}
            {checkinTime && (
              <p className="text-xl text-red-400 font-semibold mb-6">{checkinTime}</p>
            )}

            <p className="text-slate-400 text-sm mb-8">Already checked in today. See you tomorrow!</p>

            <div className="space-y-3">
              <Link href="/workout">
                <Button className="w-full min-h-[48px]" size="lg">Log a Workout</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" className="w-full min-h-[48px]">Dashboard</Button>
              </Link>
            </div>
          </div>
        )}

        {/* ── Expired ── */}
        {status === 'expired' && (
          <div className="glass-card p-8 text-center border border-red-500/30">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Membership Expired</h1>
            <p className="text-slate-400 text-sm mb-8">{message || 'Please renew your membership to check in.'}</p>
            <div className="space-y-3">
              <Link href="/dashboard">
                <Button variant="ghost" className="w-full min-h-[48px]">Go to Dashboard</Button>
              </Link>
            </div>
            <p className="text-xs text-slate-700 mt-6">{todayDisplay}</p>
          </div>
        )}

        {/* ── Error ── */}
        {status === 'error' && (
          <div className="glass-card p-8 text-center border border-red-500/30">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Check-in Failed</h1>
            <p className="text-slate-400 text-sm mb-8">{message || 'Something went wrong. Please try again.'}</p>
            <div className="space-y-3">
              <Button onClick={() => setStatus('idle')} variant="secondary" className="w-full min-h-[48px]">
                Try Again
              </Button>
              <Link href="/dashboard">
                <Button variant="ghost" className="w-full min-h-[48px]">Go to Dashboard</Button>
              </Link>
            </div>
            <p className="text-xs text-slate-700 mt-6">{todayDisplay}</p>
          </div>
        )}

        {/* ── Unauthorized ── */}
        {status === 'unauthorized' && (
          <div className="glass-card p-8 text-center border border-amber-500/30">
            <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <QrCode className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Sign In Required</h1>
            <p className="text-slate-400 text-sm mb-8">Please sign in to your Max Muscle account to check in.</p>
            <div className="space-y-3">
              <Link href="/login">
                <Button className="w-full min-h-[48px]" size="lg">Sign In</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" className="w-full min-h-[48px]">Dashboard</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
