'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, Calendar, Flame, Trophy, QrCode, AlertTriangle, ChevronDown, Timer } from 'lucide-react';
import { StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate, daysRemaining, isMembershipActive, CATEGORY_COLORS } from '@/lib/utils';
import Link from 'next/link';
import type { Workout } from '@/types';

function fmtDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const TYPE_COLORS: Record<string, string> = {
  push: 'bg-rose-500', pull: 'bg-blue-500', legs: 'bg-emerald-500', custom: 'bg-red-600',
};
const TYPE_LABELS: Record<string, string> = { push: 'Push', pull: 'Pull', legs: 'Legs', custom: 'Custom' };

interface DashUser { id: string; phone_number: string; name: string | null }
interface Membership { start_date: string; end_date: string; active: boolean }

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<DashUser | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [analytics, setAnalytics] = useState<{ totalWorkouts: number; currentStreak: number } | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [prs, setPRs] = useState<{ id: string; max_weight: number; exercises?: { name: string } }[]>([]);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [meRes, analyticsRes, workoutsRes, prsRes, attendanceRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/analytics'),
        fetch('/api/workout?limit=14'),
        fetch('/api/workout/prs'),
        fetch('/api/attendance/history?limit=1'),
      ]);

      if (meRes.status === 401) { router.push('/login'); return; }

      const meData = await meRes.json();
      setUser(meData.user);
      setMembership(meData.membership);

      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (workoutsRes.ok) { const w = await workoutsRes.json(); setWorkouts(w.workouts || []); }
      if (prsRes.ok) { const p = await prsRes.json(); setPRs((p.prs || []).slice(0, 4)); }
      if (attendanceRes.ok) {
        const att = await attendanceRes.json();
        const today = new Date().toISOString().split('T')[0];
        setCheckedInToday(att.attendance?.[0]?.date === today);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const memberActive = membership ? isMembershipActive(membership.end_date) : false;
  const daysLeft = membership ? daysRemaining(membership.end_date) : 0;
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div>
          <div className="skeleton h-3 w-24 mb-2 rounded" />
          <div className="skeleton h-8 w-48 rounded" />
        </div>
        {/* Membership skeleton */}
        <div className="skeleton h-16 w-full rounded-2xl" />
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
        </div>
        {/* Quick start skeleton */}
        <div className="skeleton h-16 rounded-2xl" />
        {/* Workouts skeleton */}
        <div className="space-y-2">
          <div className="skeleton h-4 w-36 rounded mb-3" />
          {[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[11px] tracking-[0.2em] uppercase text-slate-500">{greeting()}</p>
        <h1 className="font-display text-5xl text-white leading-none mt-1">
          {(user?.name || user?.phone_number || 'Athlete').toUpperCase()}
        </h1>
      </div>

      {/* Membership status */}
      {membership ? (
        <div className={`glass-card p-4 flex items-center justify-between ${!memberActive ? 'border-red-500/40' : daysLeft <= 7 ? 'border-amber-500/40' : ''}`}>
          <div className="flex items-center gap-3">
            {memberActive ? <Calendar className="w-5 h-5 text-red-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
            <div>
              <p className="font-medium text-white text-sm">{memberActive ? 'Membership Active' : 'Membership Expired'}</p>
              <p className="text-xs text-slate-400">
                {memberActive
                  ? `${daysLeft} days remaining · Expires ${formatDate(membership.end_date)}`
                  : `Expired on ${formatDate(membership.end_date)} — Contact gym to renew`}
              </p>
            </div>
          </div>
          <Badge variant={memberActive ? (daysLeft <= 7 ? 'warning' : 'success') : 'danger'}>
            {memberActive ? `${daysLeft}d left` : 'Expired'}
          </Badge>
        </div>
      ) : (
        <div className="glass-card p-4 border-amber-500/30">
          <p className="text-amber-400 text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> No membership found. Contact your gym admin.
          </p>
        </div>
      )}

      {/* Check-in CTA */}
      {memberActive && (
        <Link
          href="/checkin"
          className={`flex items-center gap-4 glass-card p-4 transition-all hover:border-red-600/50 ${checkedInToday ? 'opacity-70 pointer-events-none' : 'cursor-pointer'}`}
        >
          <div className={`p-3 rounded-xl ${checkedInToday ? 'bg-emerald-500/10' : 'bg-red-600/10'}`}>
            <QrCode className={`w-5 h-5 ${checkedInToday ? 'text-emerald-400' : 'text-red-400'}`} />
          </div>
          <div>
            <p className="font-medium text-white text-sm">{checkedInToday ? 'Checked in today ✓' : 'Check in for today'}</p>
            <p className="text-xs text-slate-400">{checkedInToday ? 'See you tomorrow!' : 'Tap to scan QR or check in now'}</p>
          </div>
          {!checkedInToday && <span className="ml-auto text-red-400 text-sm">→</span>}
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Workouts" value={analytics?.totalWorkouts ?? 0} icon={<Dumbbell className="w-5 h-5" />} color="red" />
        <StatCard label="Current Streak" value={`${analytics?.currentStreak ?? 0}d`} icon={<Flame className="w-5 h-5" />} color="amber" />
      </div>

      {/* Quick start workout */}
      <Link href="/workout" className="glass-card p-4 flex items-center gap-4 hover:border-red-600/50 transition-all">
        <div className="p-3 bg-red-600/10 rounded-xl">
          <Dumbbell className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <p className="font-medium text-white text-sm">Start a Workout</p>
          <p className="text-xs text-slate-400">Push · Pull · Legs · Custom</p>
        </div>
        <span className="ml-auto text-red-400 text-sm">→</span>
      </Link>

      {/* 14-day workout history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Recent Workouts</h2>
          <Link href="/workout" className="text-xs text-red-400 hover:text-red-300">View all →</Link>
        </div>
        <div className="space-y-2">
          {workouts.length === 0 && (
            <div className="glass-card p-8 text-center">
              <Dumbbell className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No workouts yet.</p>
              <Link href="/workout" className="text-red-400 text-sm hover:text-red-300 mt-1 inline-block">Log your first workout →</Link>
            </div>
          )}
          {workouts.map((w) => {
            type E = { id: string; weight: number; reps: number; sets: number; exercises?: { name: string; category: string } };
            const typedEntries = ((w.workout_entries || w.entries || []) as unknown as E[]);
            const wType = w.workout_type || 'custom';

            return (
              <details key={w.id} className="glass-card overflow-hidden group">
                <summary className="flex items-center gap-3 p-4 cursor-pointer list-none hover:bg-white/2 transition-colors">
                  <div className={`w-2 h-8 rounded-full flex-shrink-0 ${TYPE_COLORS[wType]}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white text-sm">{formatDate(w.date, 'EEE, MMM dd')}</p>
                      <span className="text-xs text-slate-500">{TYPE_LABELS[wType]}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {typedEntries.length} exercises
                      {w.duration_seconds && w.duration_seconds > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1">
                          <Timer className="w-3 h-3" />{fmtDuration(w.duration_seconds)}
                        </span>
                      )}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="border-t border-white/5 divide-y divide-white/5">
                  {typedEntries.map((e) => (
                    <div key={e.id} className="flex items-center justify-between px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: CATEGORY_COLORS[e.exercises?.category || ''] || '#6366f1' }}
                        />
                        <span className="text-slate-300">{e.exercises?.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 text-xs">
                        <span>{e.sets}×{e.reps}</span>
                        <span className="text-amber-400 font-medium">{e.weight}kg</span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </div>

      {/* PRs */}
      {prs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">Personal Records</h2>
            <Link href="/leaderboard" className="text-xs text-red-400 hover:text-red-300">Leaderboard →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {prs.map((pr) => (
              <div key={pr.id} className="glass-card p-4 relative overflow-hidden">
                <div className="absolute -bottom-2 -right-2 font-display text-7xl text-amber-500/6 leading-none select-none pointer-events-none">
                  PR
                </div>
                <Trophy className="w-3.5 h-3.5 text-amber-500 mb-2" />
                <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">{pr.exercises?.name}</p>
                <p className="font-display text-4xl text-amber-400 leading-none mt-1">{pr.max_weight}<span className="text-xl text-amber-600 ml-1">KG</span></p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
