'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, Users, UserCheck, Dumbbell, CalendarCheck, ImageIcon,
  LogOut, RefreshCw, ExternalLink, Shield, TrendingUp, Activity, Brain,
  CheckCircle2, XCircle, Database,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import GymOSLoader from '@/components/GymOSLoader';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PlatformStats {
  totalGyms: number;
  totalMembers: number;
  activeMembers: number;
  totalWorkouts: number;
  totalAttendance: number;
  totalPosts: number;
}

interface GymRow {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  member_count: number;
  active_member_count: number;
  workout_count: number;
  attendance_this_month: number;
  post_count: number;
  subscription: {
    plan_name: string;
    status: 'trial' | 'active' | 'expired' | 'paused';
    renewal_date: string | null;
  } | null;
}

interface AiGlobalSummary {
  summary: {
    consented: number;
    declined: number;
    total_dataset_rows: number;
    avg_workouts_per_week: number;
  };
  weekly_trends: {
    week: string;
    active_members: number;
    avg_volume_kg: number;
    avg_adherence_pct: number;
    avg_sessions: number;
    avg_progression: number;
  }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const COLOURS = ['#8b5cf6', '#E11D1D', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

// dark tooltip — keeps background black even on hover
const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#111111',
  border: '1px solid #2a2a2a',
  borderRadius: 8,
  fontSize: 12,
  color: '#e2e8f0',
};

// ── Badge helpers ─────────────────────────────────────────────────────────────
function subBadgeVariant(s: string): 'success' | 'info' | 'danger' | 'warning' | 'default' {
  if (s === 'active')  return 'success';
  if (s === 'trial')   return 'info';
  if (s === 'expired') return 'danger';
  if (s === 'paused')  return 'warning';
  return 'default';
}
function gymBadgeVariant(s: string): 'success' | 'danger' | 'default' {
  if (s === 'active')    return 'success';
  if (s === 'suspended') return 'danger';
  return 'default';
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SuperAdminPage() {
  const router = useRouter();

  // Phase: 'loader' → show GymOSLoader; 'dashboard' → show content
  const [phase, setPhase] = useState<'loader' | 'dashboard'>('loader');

  const [stats, setStats]     = useState<PlatformStats | null>(null);
  const [gyms,  setGyms]      = useState<GymRow[]>([]);
  const [aiGlobal, setAiGlobal] = useState<AiGlobalSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Refs used to coordinate loader finish + API response without stale closures
  const resolvedRef = useRef({ loaderDone: false, authDone: false, authed: false });

  function checkTransition() {
    const r = resolvedRef.current;
    if (!r.loaderDone || !r.authDone) return; // wait until both ready
    if (!r.authed) {
      router.push('/login');
    } else {
      setPhase('dashboard');
    }
  }

  // Fetch data (runs in parallel with loader animation)
  async function fetchAll(isRefresh = false) {
    if (isRefresh) setRefreshing(true);

    const [sRes, gRes, aiRes] = await Promise.all([
      fetch('/api/super-admin/stats'),
      fetch('/api/super-admin/gyms'),
      fetch('/api/super-admin/ai-analytics/global'),
    ]);

    if (sRes.status === 401 || sRes.status === 403) {
      resolvedRef.current.authDone  = true;
      resolvedRef.current.authed    = false;
      if (isRefresh) router.push('/login');
      else           checkTransition();
      return;
    }

    const [sData, gData] = await Promise.all([sRes.json(), gRes.json()]);
    setStats(sData);
    setGyms(gData.gyms ?? []);
    if (aiRes.ok) setAiGlobal(await aiRes.json());

    resolvedRef.current.authDone = true;
    resolvedRef.current.authed   = true;
    if (isRefresh) setRefreshing(false);
    else           checkTransition();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll(); // API call starts immediately on mount — runs parallel with loader
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Called by GymOSLoader when animation reaches 100%
  function handleLoaderComplete() {
    resolvedRef.current.loaderDone = true;
    checkTransition();
  }

  // ── Loader phase ─────────────────────────────────────────────────────────────
  if (phase === 'loader') {
    return <GymOSLoader visible={true} gymName="GymOS" onComplete={handleLoaderComplete} />;
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────

  // Chart data — no name truncation
  const attendanceBarData = gyms.map((g) => ({
    name: g.name,
    attendance: g.attendance_this_month,
    workouts: g.workout_count,
  }));

  const subStatusCount = gyms.reduce<Record<string, number>>((acc, g) => {
    const s = g.subscription?.status ?? 'none';
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  const subPieData = Object.entries(subStatusCount).map(([name, value], i) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: COLOURS[i % COLOURS.length],
  }));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#000000] p-4 text-white md:p-6">
      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes count-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.15); }
          50% { box-shadow: 0 0 40px rgba(124,58,237,0.35); }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-600/6 blur-[140px]" />
        <div className="absolute bottom-[-120px] right-[-90px] h-[460px] w-[460px] rounded-full bg-indigo-700/5 blur-[140px]" />
        <div className="absolute left-[-120px] top-1/2 h-[420px] w-[420px] rounded-full bg-purple-800/4 blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-7xl">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/5 bg-[#050505]/70 px-4 py-4 backdrop-blur-xl md:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10" style={{ animation: 'glow-pulse 3s ease-in-out infinite' }}>
              <Shield className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="font-display text-xl tracking-wide text-white leading-tight">Super Admin</h1>
              <p className="text-xs text-slate-500">GymOS Platform Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              className="rounded-xl border border-white/8 bg-white/0 p-2 text-slate-400 transition-all hover:border-violet-500/20 hover:bg-violet-500/8 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login');
              }}
              className="flex items-center gap-1.5 rounded-xl border border-white/8 px-3 py-2 text-xs text-slate-400 transition-all hover:border-violet-500/20 hover:bg-violet-500/8 hover:text-white"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* ── Summary cards — 2 cols mobile, 3 cols md, 6 cols lg ─────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {([
            { label: 'Total Gyms',     value: stats?.totalGyms       ?? 0, icon: Building2,    color: 'violet'  },
            { label: 'Total Members',  value: stats?.totalMembers    ?? 0, icon: Users,         color: 'blue'    },
            { label: 'Active Members', value: stats?.activeMembers   ?? 0, icon: UserCheck,     color: 'emerald' },
            { label: 'Workouts',       value: stats?.totalWorkouts   ?? 0, icon: Dumbbell,      color: 'red'     },
            { label: 'Check-ins',      value: stats?.totalAttendance ?? 0, icon: CalendarCheck, color: 'amber'   },
            { label: 'Posts',          value: stats?.totalPosts      ?? 0, icon: ImageIcon,     color: 'rose'    },
          ] as const).map(({ label, value, icon: Icon, color }) => (
            <Card
              key={label}
              className="group flex items-center gap-3 rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-500/20"
              style={{ animation: 'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both', animationDelay: `${([
                'Total Gyms',
                'Total Members',
                'Active Members',
                'Workouts',
                'Check-ins',
                'Posts',
              ].indexOf(label) * 80)}ms` }}
            >
              <div className={`rounded-xl p-2.5 flex-shrink-0 bg-${color}-500/10 text-${color}-400 transition-transform duration-300 group-hover:scale-110`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                {/* No truncate — allow wrapping on small screens */}
                <p className="text-[10px] text-slate-500 whitespace-normal break-words leading-tight">{label}</p>
                <p className="text-2xl font-black text-white tabular-nums" style={{ animation: 'count-in 0.4s ease both', animationDelay: `${([
                  'Total Gyms',
                  'Total Members',
                  'Active Members',
                  'Workouts',
                  'Check-ins',
                  'Posts',
                ].indexOf(label) * 80 + 80)}ms` }}>{value.toLocaleString()}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Charts — stacks on mobile ────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          {/* Attendance + Workouts bar chart */}
          <div className="col-span-1 rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 md:col-span-2" style={{ animation: 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both' }}>
            <div className="mb-4 flex flex-wrap items-center gap-2 border-l-2 border-violet-500 pl-3">
              <Activity className="w-4 h-4 flex-shrink-0 text-violet-400" />
              <h2 className="font-display text-sm tracking-wide text-white whitespace-normal break-words">
                Attendance &amp; Workouts by Gym (this month)
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={attendanceBarData} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  // wrap long names at word boundaries
                  tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 10) + '…' : v}
                />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                {/* cursor colour instead of white flash */}
                <Tooltip
                  contentStyle={{ ...TOOLTIP_STYLE, background: '#0a0a0a', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 10, fontSize: 12, color: '#e2e8f0', padding: '8px 12px' }}
                  cursor={{ fill: 'rgba(139,92,246,0.08)' }}
                />
                <Bar dataKey="attendance" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Attendance" animationDuration={800} />
                <Bar dataKey="workouts"   fill="#E11D1D" radius={[4, 4, 0, 0]} name="Workouts" animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex gap-4 mt-2">
              {[{ label: 'Attendance', color: '#8b5cf6' }, { label: 'Workouts', color: '#E11D1D' }].map((l) => (
                <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>

          {/* Subscription status pie */}
          <div className="col-span-1 rounded-2xl border border-white/6 bg-[#0a0a0a] p-5" style={{ animation: 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.3s both' }}>
            <div className="mb-4 flex items-center gap-2 border-l-2 border-violet-500 pl-3">
              <TrendingUp className="w-4 h-4 flex-shrink-0 text-violet-400" />
              <h2 className="font-display text-sm tracking-wide text-white">Subscription Status</h2>
            </div>
            {subPieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={subPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                      labelLine={false}
                      animationBegin={200}
                      animationDuration={800}
                    >
                      {subPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
                  {subPieData.map((d) => (
                    <span key={d.name} className="flex items-center gap-1 text-[11px] text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: d.color }} />
                      {d.name}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-slate-600 text-sm text-center mt-10">No data</p>
            )}
          </div>
        </div>

        {/* ── Gyms table ───────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-white/6 bg-[#0a0a0a]">
          <div className="flex items-center gap-2 border-b border-white/5 bg-[#050505] px-4 py-3">
            <Building2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <h2 className="font-display text-sm tracking-wide text-white">All Gyms</h2>
            <span className="ml-auto text-xs text-slate-500 flex-shrink-0">
              {gyms.length} gym{gyms.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/5">
                <tr>
                  {['Gym', 'Members', 'Active', 'Workouts', 'Attend (mo)', 'Posts', 'Plan', 'Renewal', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {gyms.map((g) => (
                  <tr key={g.id} className="transition-colors duration-150 hover:bg-violet-500/5">
                    <td className="px-4 py-3 max-w-[220px]">
                      {/* No truncation — wrap naturally */}
                      <p className="font-display text-sm tracking-wide text-white whitespace-normal break-words">{g.name}</p>
                      {g.address && (
                        <p className="text-xs text-slate-500 mt-0.5 whitespace-normal break-words">{g.address}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300 tabular-nums">{g.member_count}</td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-400 font-semibold tabular-nums">{g.active_member_count}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 tabular-nums">{g.workout_count}</td>
                    <td className="px-4 py-3 text-slate-300 tabular-nums">{g.attendance_this_month}</td>
                    <td className="px-4 py-3 text-slate-300 tabular-nums">{g.post_count}</td>
                    <td className="px-4 py-3">
                      {g.subscription
                        ? <span className="text-xs text-slate-300 capitalize">{g.subscription.plan_name}</span>
                        : <span className="text-xs text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {g.subscription?.renewal_date ? formatDate(g.subscription.renewal_date) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge variant={gymBadgeVariant(g.status)}>{g.status}</Badge>
                        {g.subscription && (
                          <Badge variant={subBadgeVariant(g.subscription.status)}>
                            {g.subscription.status}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/super-admin/gyms/${g.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-violet-500/0 px-2 py-1 text-xs text-slate-500 transition-all whitespace-nowrap hover:bg-violet-500/10 hover:text-violet-400"
                      >
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
                {gyms.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-600">
                      No gyms found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-white/5">
            {gyms.map((g) => (
              <div key={g.id} className="mb-3 rounded-2xl border border-white/6 bg-[#0a0a0a] p-4 transition-all hover:border-violet-500/15">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm tracking-wide text-white whitespace-normal break-words">{g.name}</p>
                    {g.address && (
                      <p className="text-xs text-slate-500 mt-0.5 whitespace-normal break-words">{g.address}</p>
                    )}
                  </div>
                  <Badge variant={gymBadgeVariant(g.status)} >{g.status}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs mb-3">
                  <div><p className="text-slate-600 mb-0.5">Members</p><p className="text-slate-200 font-semibold">{g.member_count}</p></div>
                  <div><p className="text-slate-600 mb-0.5">Active</p><p className="text-emerald-400 font-semibold">{g.active_member_count}</p></div>
                  <div><p className="text-slate-600 mb-0.5">Workouts</p><p className="text-slate-200 font-semibold">{g.workout_count}</p></div>
                  <div><p className="text-slate-600 mb-0.5">Attend (mo)</p><p className="text-slate-200 font-semibold">{g.attendance_this_month}</p></div>
                  <div><p className="text-slate-600 mb-0.5">Posts</p><p className="text-slate-200 font-semibold">{g.post_count}</p></div>
                  <div>
                    <p className="text-slate-600 mb-0.5">Plan</p>
                    {g.subscription
                      ? <Badge variant={subBadgeVariant(g.subscription.status)}>{g.subscription.status}</Badge>
                      : <span className="text-slate-600">—</span>}
                  </div>
                </div>

                {g.subscription?.renewal_date && (
                  <p className="text-xs text-slate-600 mb-2">
                    Renews: <span className="text-slate-400">{formatDate(g.subscription.renewal_date)}</span>
                  </p>
                )}

                <Link
                  href={`/super-admin/gyms/${g.id}`}
                  className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  View details
                </Link>
              </div>
            ))}
            {gyms.length === 0 && (
              <p className="px-4 py-10 text-center text-slate-600 text-sm">No gyms found</p>
            )}
          </div>
        </div>

        {/* ── AI Analytics Overview ────────────────────────────────────────── */}
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-400" />
            <h2 className="font-display text-sm tracking-widest text-white uppercase">AI Analytics Overview</h2>
            <span className="text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
              Anonymised · No PII
            </span>
          </div>

          {/* AI summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'AI Consented',     value: aiGlobal?.summary.consented          ?? '—', icon: CheckCircle2, color: 'emerald' },
              { label: 'AI Declined',      value: aiGlobal?.summary.declined           ?? '—', icon: XCircle,      color: 'rose'    },
              { label: 'Dataset Rows',     value: aiGlobal?.summary.total_dataset_rows ?? '—', icon: Database,     color: 'violet'  },
              { label: 'Avg Workouts/wk',  value: aiGlobal?.summary.avg_workouts_per_week ?? '—', icon: Dumbbell, color: 'amber'   },
            ].map(({ label, value, icon: Icon, color }, index) => (
              <Card
                key={label}
                className="group flex items-center gap-3 rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-500/20"
                style={{ animation: 'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both', animationDelay: `${400 + index * 80}ms` }}
              >
                <div className={`rounded-xl p-2.5 shrink-0 bg-${color}-500/10 text-${color}-400 transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500">{label}</p>
                  <p className="text-2xl font-black text-white tabular-nums" style={{ animation: 'count-in 0.4s ease both', animationDelay: `${480 + index * 80}ms` }}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* AI trend charts */}
          {aiGlobal && aiGlobal.weekly_trends.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              {/* Volume trend */}
              <div style={{ animation: 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 0ms both' }}>
                <AiLineCard title="Weekly Training Volume (avg kg)" color="#8b5cf6">
                <LineChart data={aiGlobal.weekly_trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                  <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="avg_volume_kg" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Avg Volume (kg)" animationDuration={1000} animationEasing="ease-out" />
                </LineChart>
                </AiLineCard>
              </div>

              {/* Adherence trend */}
              <div style={{ animation: 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 100ms both' }}>
                <AiLineCard title="Adherence Trend (avg %)" color="#10b981">
                <LineChart data={aiGlobal.weekly_trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                  <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Adherence']} />
                  <Line type="monotone" dataKey="avg_adherence_pct" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Adherence %" animationDuration={1000} animationEasing="ease-out" />
                </LineChart>
                </AiLineCard>
              </div>

              {/* Strength progression score */}
              <div style={{ animation: 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 200ms both' }}>
                <AiLineCard title="Avg Progression Score" color="#f59e0b">
                <LineChart data={aiGlobal.weekly_trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                  <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="avg_progression" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} strokeDasharray="5 2" name="Progression" animationDuration={1000} animationEasing="ease-out" />
                </LineChart>
                </AiLineCard>
              </div>

              {/* Active members trend */}
              <div style={{ animation: 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 300ms both' }}>
                <AiLineCard title="Active Members in Dataset" color="#3b82f6">
                <LineChart data={aiGlobal.weekly_trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                  <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="active_members" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Active Members" animationDuration={1000} animationEasing="ease-out" />
                </LineChart>
                </AiLineCard>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#0a0a0a] p-8 text-center">
              <Brain className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No AI dataset entries yet.</p>
              <p className="text-xs text-slate-700 mt-1">Data appears after members accept Terms & AI consent.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Small chart wrapper ───────────────────────────────────────────────────────
function AiLineCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 transition-all duration-300 hover:border-violet-500/15">
      <div className="mb-3 flex items-center gap-2 border-l-2 pl-3" style={{ borderLeftColor: color }}>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
        <p className="font-display text-xs tracking-wide text-slate-400">{title}</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}
