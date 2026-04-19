'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader, QrCode } from 'lucide-react';
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

function WorkoutGuidance() {
  return (
    <div className="mt-6 rounded-2xl border border-white/6 bg-[#111111]/80 px-4 py-4 text-center shadow-[0_0_30px_rgba(124,58,237,0.04)]">
      <p className="text-sm font-medium text-slate-300">
        To log your workout, use the Workout tab below.
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Your activity will be recorded automatically once you begin.
      </p>
    </div>
  );
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
    <div className="flex flex-col items-center justify-center min-h-[calc(100svh-9rem)] sm:min-h-[calc(100svh-2rem)] lg:min-h-[calc(100svh-4rem)]">
      <div className="w-full max-w-sm">

        {/* ── Idle state ── */}
        {status === 'idle' && (
          <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-8 text-center shadow-[0_0_40px_rgba(124,58,237,0.06)]">
            {userName && (
              <p className="text-slate-400 text-sm mb-6">
                Welcome, <span className="text-white font-semibold">{userName}</span>
                {memberDays !== null && (
                  <span className="text-xs text-slate-500 ml-1">· {memberDays}d left</span>
                )}
              </p>
            )}
            <div className="relative flex items-center justify-center mb-8">
              <div className="pulse-ring flex h-24 w-24 items-center justify-center rounded-full bg-violet-500/10">
                <QrCode className="h-12 w-12 text-violet-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Max Muscle Check-In</h1>
            <p className="text-slate-400 text-sm mb-8">Tap below to record your attendance for today.</p>
            <Button onClick={handleCheckIn} size="lg" className="btn-shine w-full min-h-[52px] bg-violet-600 text-base text-white shadow-[0_8px_30px_rgba(124,58,237,0.25)] hover:bg-violet-500">
              Check In Now
            </Button>
            <WorkoutGuidance />
            <p className="text-xs text-slate-600 mt-4">{todayDisplay}</p>
          </div>
        )}

        {/* ── Loading state ── */}
        {status === 'loading' && (
          <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-12 flex flex-col items-center gap-4 shadow-[0_0_40px_rgba(124,58,237,0.06)]">
            <Loader className="h-10 w-10 animate-spin text-violet-400" />
            <p className="text-slate-300 text-sm">Processing check-in...</p>
          </div>
        )}

        {/* ── Success state ── */}
        {status === 'success' && (
          <div className="rounded-2xl border border-violet-500/20 bg-[#0a0a0a] p-8 text-center shadow-[0_0_40px_rgba(124,58,237,0.08)]">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/10">
              <CheckCircle className="h-10 w-10 text-violet-400" />
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
            <p className="mb-6 text-xl font-semibold text-violet-400">{checkinTime}</p>

            <p className="mb-8 text-sm font-medium text-violet-300">
              ✅ Checked In — Have a great workout!
            </p>
            <WorkoutGuidance />
          </div>
        )}

        {/* ── Already checked in ── */}
        {status === 'already' && (
          <div className="rounded-2xl border border-violet-500/20 bg-[#0a0a0a] p-8 text-center shadow-[0_0_40px_rgba(124,58,237,0.06)]">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/10">
              <CheckCircle className="h-10 w-10 text-violet-400" />
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
            <p className="mb-6 text-xl font-semibold text-violet-400">{checkinTime}</p>
            )}

            <p className="text-slate-400 text-sm mb-8">Already checked in today. See you tomorrow!</p>
            <WorkoutGuidance />
          </div>
        )}

        {/* ── Expired ── */}
        {status === 'expired' && (
          <div className="rounded-2xl border border-violet-500/20 bg-[#0a0a0a] p-8 text-center shadow-[0_0_40px_rgba(124,58,237,0.06)]">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/10">
              <XCircle className="h-10 w-10 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Membership Expired</h1>
            <p className="text-slate-400 text-sm mb-8">{message || 'Please renew your membership to check in.'}</p>
            <p className="text-xs text-slate-700 mt-6">{todayDisplay}</p>
          </div>
        )}

        {/* ── Error ── */}
        {status === 'error' && (
          <div className="rounded-2xl border border-violet-500/20 bg-[#0a0a0a] p-8 text-center shadow-[0_0_40px_rgba(124,58,237,0.06)]">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/10">
              <XCircle className="h-10 w-10 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Check-in Failed</h1>
            <p className="text-slate-400 text-sm mb-8">{message || 'Something went wrong. Please try again.'}</p>
            <Button onClick={() => setStatus('idle')} variant="secondary" className="w-full min-h-[48px] border border-white/10 bg-white/5 text-slate-200 hover:border-violet-500/20 hover:bg-white/10">
              Try Again
            </Button>
            <p className="text-xs text-slate-700 mt-6">{todayDisplay}</p>
          </div>
        )}

        {/* ── Unauthorized ── */}
        {status === 'unauthorized' && (
          <div className="rounded-2xl border border-violet-500/20 bg-[#0a0a0a] p-8 text-center shadow-[0_0_40px_rgba(124,58,237,0.06)]">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/10">
              <QrCode className="h-10 w-10 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Sign In Required</h1>
            <p className="text-slate-400 text-sm mb-8">Please sign in to your Max Muscle account to check in.</p>
            <Link href="/login">
              <Button className="btn-shine w-full min-h-[48px] bg-violet-600 text-white hover:bg-violet-500" size="lg">Sign In</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

