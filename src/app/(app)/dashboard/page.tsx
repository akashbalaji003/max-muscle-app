'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, Calendar, Flame, Trophy, QrCode, AlertTriangle, ChevronDown, Timer, Activity, Target } from 'lucide-react';
import { StatCard } from '@/components/ui/Card';
import { formatDate, daysRemaining, isMembershipActive, CATEGORY_COLORS } from '@/lib/utils';
import Link from 'next/link';
import type { Workout, UserBadge } from '@/types';

function fmtDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const TYPE_LABELS: Record<string, string> = { push: 'Push', pull: 'Pull', legs: 'Legs', custom: 'Custom' };

interface DashUser { id: string; phone_number: string; name: string | null; avatar_url?: string | null }
interface Membership { start_date: string; end_date: string; active: boolean }
interface AnalyticsSnap {
  totalWorkouts: number;
  currentStreak: number;
  calories?: { today: number; week: number };
  badges?: UserBadge[];
  bmi?: number | null;
  bmiCategory?: string | null;
  bodyMetrics?: { weight_kg: number | null; goal: string | null };
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<DashUser | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSnap | null>(null);
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
        <div>
          <div className="skeleton h-3 w-24 mb-2 rounded" />
          <div className="skeleton h-8 w-48 rounded" />
        </div>
        <div className="skeleton h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
        </div>
        <div className="skeleton h-16 rounded-2xl" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-36 rounded mb-3" />
          {[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const earnedBadges = analytics?.badges?.filter(b => b.earned) || [];

  return (
    <div className="relative space-y-6 overflow-hidden">
      {/* Header */}
      <div>
        <p className="text-[11px] tracking-[0.28em] uppercase text-slate-500">{greeting()}</p>
        <div className="mt-1 flex items-center gap-3">
          {user?.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt="Profile"
              className="h-10 w-10 flex-shrink-0 rounded-full object-cover ring-2 ring-violet-500/25"
            />
          )}
          <h1 className="font-display text-3xl leading-none truncate text-white sm:text-5xl">
            {(user?.name || user?.phone_number || 'Athlete').toUpperCase()}
          </h1>
        </div>
      </div>

      {/* Badge strip — show only if badges earned */}
      {earnedBadges.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {earnedBadges.map((b) => (
            <div key={b.type} title={b.description}
              className="flex-shrink-0 flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs whitespace-nowrap text-violet-300">
              <span>{b.icon}</span>{b.label}
            </div>
          ))}
          <Link href="/analytics" className="flex-shrink-0 whitespace-nowrap pl-1 text-xs text-slate-500 hover:text-violet-300">
            View all →
          </Link>
        </div>
      )}

      {/* Membership status */}
      {membership ? (
        <div className="flex items-center justify-between rounded-2xl border border-white/6 bg-[#0a0a0a] p-4 shadow-[0_0_40px_rgba(124,58,237,0.06)]">
          <div className="flex items-center gap-3">
            {memberActive ? <Calendar className="h-5 w-5 text-violet-400" /> : <AlertTriangle className="h-5 w-5 text-violet-400" />}
            <div>
              <p className="font-medium text-white text-sm">{memberActive ? 'Membership Active' : 'Membership Expired'}</p>
              <p className="text-xs text-slate-400">
                {memberActive
                  ? `${daysLeft} days remaining · Expires ${formatDate(membership.end_date)}`
                  : `Expired on ${formatDate(membership.end_date)} — Contact gym to renew`}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-400">
            {memberActive ? `${daysLeft}d left` : 'Expired'}
          </span>
        </div>
      ) : (
        <div className="rounded-2xl border border-violet-500/15 bg-[#0a0a0a] p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-violet-300">
            <AlertTriangle className="h-4 w-4" /> No membership found. Contact your gym admin.
          </p>
        </div>
      )}

      {/* Check-in CTA */}
      {memberActive && (
        <Link
          href="/checkin"
          className={`flex items-center gap-4 rounded-2xl border border-white/6 bg-[#0a0a0a] p-4 transition-all duration-200 hover:border-violet-500/20 hover:shadow-[0_0_40px_rgba(124,58,237,0.10)] ${checkedInToday ? 'pointer-events-none opacity-70' : 'cursor-pointer'}`}
        >
          <div className="rounded-xl bg-violet-500/10 p-3">
            <QrCode className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <p className="font-medium text-white text-sm">{checkedInToday ? 'Checked in today ✓' : 'Check in for today'}</p>
            <p className="text-xs text-slate-400">{checkedInToday ? 'See you tomorrow!' : 'Tap to scan QR or check in now'}</p>
          </div>
          {!checkedInToday && <span className="ml-auto text-violet-400 text-sm">→</span>}
        </Link>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Workouts" value={analytics?.totalWorkouts ?? 0} icon={<Dumbbell className="h-5 w-5" />} color="violet" />
        <StatCard label="Current Streak" value={`${analytics?.currentStreak ?? 0}d`} icon={<Flame className="h-5 w-5" />} color="violet" />
      </div>

      {/* Calories today + BMI strip */}
      <div className="grid grid-cols-2 gap-3">
        {/* Calories today */}
        <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-4 flex items-center gap-3">
          <div className="p-2.5 bg-violet-500/10 rounded-xl flex-shrink-0">
            <Flame className="w-4 h-4 text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-2xl leading-none text-violet-400">{(analytics?.calories?.today ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">kcal today</p>
          </div>
        </div>

        {/* BMI or goal nudge */}
        {analytics?.bmi ? (
          <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-4 flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/10 rounded-xl flex-shrink-0">
              <Activity className="w-4 h-4 text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-2xl leading-none text-violet-400">{analytics.bmi}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">BMI · {analytics.bmiCategory}</p>
            </div>
          </div>
        ) : (
          <Link href="/analytics" className="flex items-center gap-3 rounded-2xl border border-white/6 bg-[#0a0a0a] p-4 transition-all duration-200 hover:border-violet-500/20 hover:shadow-[0_0_40px_rgba(124,58,237,0.10)]">
            <div className="p-2.5 bg-violet-500/10 rounded-xl flex-shrink-0">
              <Target className="w-4 h-4 text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">Set goal</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Unlock BMI & recs</p>
            </div>
          </Link>
        )}
      </div>

      {/* Quick start workout */}
      <Link href="/workout" className="flex items-center gap-4 rounded-2xl border border-white/6 bg-[#0a0a0a] p-4 transition-all duration-200 hover:border-violet-500/20 hover:shadow-[0_0_40px_rgba(124,58,237,0.10)]">
        <div className="p-3 bg-violet-500/10 rounded-xl">
          <Dumbbell className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <p className="font-medium text-white text-sm">Start a Workout</p>
          <p className="text-xs text-slate-400">Push · Pull · Legs · Custom</p>
        </div>
        <span className="ml-auto text-violet-400 text-sm">→</span>
      </Link>

      {/* 14-day workout history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Recent Workouts</h2>
          <Link href="/workout" className="text-xs text-violet-400 hover:text-violet-300">View all →</Link>
        </div>
        <div className="space-y-2">
          {workouts.length === 0 && (
            <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-8 text-center">
              <Dumbbell className="mx-auto mb-2 h-8 w-8 text-slate-700" />
              <p className="text-slate-400 text-sm">No workouts yet.</p>
              <Link href="/workout" className="mt-1 inline-block text-sm text-violet-400 hover:text-violet-300">Log your first workout →</Link>
            </div>
          )}
          {workouts.map((w) => {
            type E = { id: string; weight: number; reps: number; sets: number; exercises?: { name: string; category: string } };
            const typedEntries = ((w.workout_entries || w.entries || []) as unknown as E[]);
            const wType = w.workout_type || 'custom';

            return (
              <details key={w.id} className="group overflow-hidden rounded-2xl border border-white/6 bg-[#0a0a0a]">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4 transition-colors hover:bg-white/3">
                  <div className="h-8 w-2 flex-shrink-0 rounded-full bg-violet-500" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white text-sm">{formatDate(w.date, 'EEE, MMM dd')}</p>
                      <span className="text-xs text-violet-400">{TYPE_LABELS[wType]}</span>
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
                  <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
                </summary>
                <div className="divide-y divide-white/5 border-t border-white/5">
                  {typedEntries.map((e) => (
                    <div key={e.id} className="flex items-center justify-between px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[e.exercises?.category || ''] || '#8B5CF6' }} />
                        <span className="text-slate-300">{e.exercises?.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 text-xs">
                        <span>{e.sets}×{e.reps}</span>
                        <span className="font-medium text-violet-400">{e.weight}kg</span>
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
          <Link href="/leaderboard" className="text-xs text-violet-400 hover:text-violet-300">Leaderboard →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {prs.map((pr) => (
            <div key={pr.id} className="relative overflow-hidden rounded-2xl border border-white/6 bg-[#0a0a0a] p-4">
              <div className="absolute -bottom-2 -right-2 select-none pointer-events-none font-display text-7xl leading-none text-violet-500/6">
                PR
              </div>
              <Trophy className="mb-2 h-3.5 w-3.5 text-violet-400" />
              <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">{pr.exercises?.name}</p>
              <p className="font-display mt-1 text-4xl leading-none text-violet-400">{pr.max_weight}<span className="ml-1 text-xl text-violet-600">KG</span></p>
            </div>
          ))}
        </div>
        </div>
      )}
    </div>
  );
}
