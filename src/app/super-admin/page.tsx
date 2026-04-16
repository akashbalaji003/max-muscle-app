'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, Users, UserCheck, Dumbbell, CalendarCheck, ImageIcon,
  LogOut, RefreshCw, ExternalLink, Shield, TrendingUp, Activity,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
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

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [gyms,  setGyms]  = useState<GymRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Refs used to coordinate loader finish + API response without stale closures
  const resolvedRef = useRef({ loaderDone: false, authDone: false, authed: false });

  function checkTransition() {
    const r = resolvedRef.current;
    if (!r.loaderDone || !r.authDone) return; // wait until both ready
    if (!r.authed) {
      router.push('/super-admin-login');
    } else {
      setPhase('dashboard');
    }
  }

  // Fetch data (runs in parallel with loader animation)
  async function fetchAll(isRefresh = false) {
    if (isRefresh) setRefreshing(true);

    const [sRes, gRes] = await Promise.all([
      fetch('/api/super-admin/stats'),
      fetch('/api/super-admin/gyms'),
    ]);

    if (sRes.status === 401 || sRes.status === 403) {
      resolvedRef.current.authDone  = true;
      resolvedRef.current.authed    = false;
      if (isRefresh) router.push('/super-admin-login');
      else           checkTransition();
      return;
    }

    const [sData, gData] = await Promise.all([sRes.json(), gRes.json()]);
    setStats(sData);
    setGyms(gData.gyms ?? []);

    resolvedRef.current.authDone = true;
    resolvedRef.current.authed   = true;
    if (isRefresh) setRefreshing(false);
    else           checkTransition();
  }

  useEffect(() => {
    fetchAll(); // API call starts immediately on mount — runs parallel with loader
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Called by GymOSLoader when animation reaches 100%
  function handleLoaderComplete() {
    resolvedRef.current.loaderDone = true;
    checkTransition();
  }

  // ── Loader phase ─────────────────────────────────────────────────────────────
  if (phase === 'loader') {
    return <GymOSLoader duration={5500} onComplete={handleLoaderComplete} />;
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
    <div className="min-h-screen bg-[#000000] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-700/30 border border-violet-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Super Admin</h1>
              <p className="text-xs text-slate-500">GymOS Platform Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/super-admin-login');
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
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
            <Card key={label} className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-xl flex-shrink-0 bg-${color}-500/10 text-${color}-400`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                {/* No truncate — allow wrapping on small screens */}
                <p className="text-[10px] text-slate-500 whitespace-normal break-words leading-tight">{label}</p>
                <p className="text-xl font-bold text-white tabular-nums">{value.toLocaleString()}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Charts — stacks on mobile ────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          {/* Attendance + Workouts bar chart */}
          <div className="col-span-1 md:col-span-2 bg-[#0f0f0f] border border-white/8 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Activity className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <h2 className="text-sm font-semibold text-white whitespace-normal break-words">
                Attendance &amp; Workouts by Gym (this month)
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
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
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'rgba(139,92,246,0.08)' }}
                />
                <Bar dataKey="attendance" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Attendance" />
                <Bar dataKey="workouts"   fill="#E11D1D" radius={[4, 4, 0, 0]} name="Workouts" />
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
          <div className="col-span-1 bg-[#0f0f0f] border border-white/8 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <h2 className="text-sm font-semibold text-white">Subscription Status</h2>
            </div>
            {subPieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={subPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={68}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                      labelLine={false}
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
                      <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: d.color }} />
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
        <div className="bg-[#0f0f0f] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <h2 className="text-sm font-semibold text-white">All Gyms</h2>
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
                  <tr key={g.id} className="hover:bg-violet-500/5 transition-colors">
                    <td className="px-4 py-3 max-w-[220px]">
                      {/* No truncation — wrap naturally */}
                      <p className="font-medium text-white text-sm whitespace-normal break-words">{g.name}</p>
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
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-violet-400 transition-colors whitespace-nowrap"
                      >
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        View
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
              <div key={g.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white text-sm whitespace-normal break-words">{g.name}</p>
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

      </div>
    </div>
  );
}
