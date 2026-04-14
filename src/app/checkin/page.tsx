'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader, QrCode, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

type Status = 'idle' | 'loading' | 'success' | 'already' | 'error' | 'unauthorized' | 'expired';

export default function CheckInPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [memberDays, setMemberDays] = useState<number | null>(null);
  const [checkinTime, setCheckinTime] = useState('');

  useEffect(() => {
    async function init() {
      // Load user profile
      const meRes = await fetch('/api/auth/me');
      if (meRes.status === 401) { setStatus('unauthorized'); return; }
      const meData = await meRes.json();
      setUserName(meData.user?.name || meData.user?.phone_number || '');
      if (meData.membership?.end_date) {
        const end = new Date(meData.membership.end_date);
        const diff = Math.max(0, Math.floor((end.getTime() - Date.now()) / 86400000));
        setMemberDays(diff);
      }

      // Check if already checked in today
      const attRes = await fetch('/api/attendance/history?limit=1');
      if (attRes.ok) {
        const attData = await attRes.json();
        const today = new Date().toISOString().split('T')[0];
        const record = attData.attendance?.[0];
        if (record?.date === today) {
          const time = new Date(record.checked_in_at).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit',
          });
          setCheckinTime(time);
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
      const time = data.checked_in_at
        ? new Date(data.checked_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : '';
      setCheckinTime(time);
      setStatus('already');
      setMessage(data.error);
      return;
    }
    if (res.status === 403) { setStatus('expired'); setMessage(data.error); return; }
    if (!res.ok) { setStatus('error'); setMessage(data.error || 'Check-in failed'); return; }

    const time = data.attendance?.checked_in_at
      ? new Date(data.attendance.checked_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setCheckinTime(time);
    setStatus('success');
    setMessage(data.message);
  }

  const statusConfig = {
    success: {
      icon: <CheckCircle className="w-16 h-16 text-emerald-400" />,
      title: 'Checked In! 🎉',
      sub: checkinTime ? `Checked in at ${checkinTime}. Have a great workout!` : 'Have a great workout today!',
      ringColor: 'bg-emerald-500/20',
      border: 'border-emerald-500/30',
    },
    already: {
      icon: <CheckCircle className="w-16 h-16 text-indigo-400" />,
      title: 'Already Checked In',
      sub: checkinTime ? `You checked in at ${checkinTime}. See you tomorrow!` : 'You already checked in today.',
      ringColor: 'bg-indigo-500/20',
      border: 'border-indigo-500/30',
    },
    expired: {
      icon: <XCircle className="w-16 h-16 text-red-400" />,
      title: 'Membership Expired',
      sub: message || 'Please renew your membership to check in.',
      ringColor: 'bg-red-500/20',
      border: 'border-red-500/30',
    },
    error: {
      icon: <XCircle className="w-16 h-16 text-red-400" />,
      title: 'Check-in Failed',
      sub: message || 'Something went wrong. Please try again.',
      ringColor: 'bg-red-500/20',
      border: 'border-red-500/30',
    },
    unauthorized: {
      icon: <QrCode className="w-16 h-16 text-amber-400" />,
      title: 'Sign In Required',
      sub: 'Please sign in to your FitHub account to check in.',
      ringColor: 'bg-amber-500/20',
      border: 'border-amber-500/30',
    },
  };

  const config = status !== 'idle' && status !== 'loading' ? statusConfig[status] : null;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/3 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
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

        {/* Gym logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">FitHub Gym</span>
        </div>

        {/* Idle state */}
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
              <div className="pulse-ring w-24 h-24 rounded-full bg-indigo-600/10 flex items-center justify-center">
                <QrCode className="w-12 h-12 text-indigo-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Gym Check-In</h1>
            <p className="text-slate-400 text-sm mb-8">Tap below to record your attendance for today.</p>
            <Button onClick={handleCheckIn} size="lg" className="w-full text-base min-h-[52px]">
              Check In Now
            </Button>
            <p className="text-xs text-slate-600 mt-4">{today}</p>
          </div>
        )}

        {/* Loading state */}
        {status === 'loading' && (
          <div className="glass-card p-12 flex flex-col items-center gap-4">
            <Loader className="w-10 h-10 text-indigo-400 animate-spin" />
            <p className="text-slate-300 text-sm">Processing check-in...</p>
          </div>
        )}

        {/* Result states */}
        {config && (
          <div className={`glass-card p-8 text-center border ${config.border}`}>
            <div className={`w-20 h-20 ${config.ringColor} rounded-full flex items-center justify-center mx-auto mb-6`}>
              {config.icon}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{config.title}</h1>
            <p className="text-slate-400 text-sm mb-8">{config.sub}</p>
            <div className="space-y-3">
              {status === 'unauthorized' && (
                <Link href="/login">
                  <Button className="w-full min-h-[48px]" size="lg">Sign In</Button>
                </Link>
              )}
              {status === 'error' && (
                <Button onClick={() => setStatus('idle')} variant="secondary" className="w-full min-h-[48px]">
                  Try Again
                </Button>
              )}
              <Link href="/dashboard">
                <Button variant="ghost" className="w-full min-h-[48px]">Go to Dashboard</Button>
              </Link>
            </div>
            <p className="text-xs text-slate-700 mt-6">{today}</p>
          </div>
        )}
      </div>
    </div>
  );
}
