'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Building2, Users, UserCheck, Dumbbell,
  CalendarCheck, ImageIcon, Shield, CreditCard,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

// ── Types ─────────────────────────────────────────────────────────────────────
interface GymDetailData {
  gym: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    status: 'active' | 'inactive' | 'suspended';
    created_at: string;
  };
  subscription: {
    plan_name: string;
    status: 'trial' | 'active' | 'expired' | 'paused';
    start_date: string;
    renewal_date: string | null;
  } | null;
  stats: {
    memberCount: number;
    activeMemberCount: number;
    workoutCount: number;
    attendanceThisMonth: number;
    postCount: number;
  };
  trends: {
    attendance:   { month: string; count: number }[];
    workouts:     { month: string; count: number }[];
    memberGrowth: { month: string; count: number }[];
  };
  topUsers: {
    id: string;
    name: string | null;
    phone: string;
    count: number;
  }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const TOOLTIP_STYLE = { background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 12 };

function fmtMonth(iso: string) {
  const [y, m] = iso.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function subBadgeVariant(status: string): 'success' | 'info' | 'danger' | 'warning' | 'default' {
  if (status === 'active')  return 'success';
  if (status === 'trial')   return 'info';
  if (status === 'expired') return 'danger';
  if (status === 'paused')  return 'warning';
  return 'default';
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GymDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const gymId  = params?.id;

  const [data, setData]       = useState<GymDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gymId) return;
    fetch(`/api/super-admin/gyms/${gymId}`)
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          router.push('/super-admin-login');
          return;
        }
        if (!res.ok) { router.push('/super-admin'); return; }
        const json = await res.json();
        setData(json);
        setLoading(false);
      });
  }, [gymId]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading gym data…</p>
        </div>
      </div>
    );
  }

  const { gym, subscription, stats, trends, topUsers } = data;

  // Format trend data for charts
  const attendanceChartData = trends.attendance.map((d) => ({ ...d, label: fmtMonth(d.month) }));
  const workoutsChartData   = trends.workouts.map((d)   => ({ ...d, label: fmtMonth(d.month) }));
  const growthChartData     = trends.memberGrowth.map((d) => ({ ...d, label: fmtMonth(d.month) }));

  return (
    <div className="min-h-screen bg-[#000000] p-4 md:p-6">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/super-admin"
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 bg-violet-700/30 border border-violet-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white leading-tight truncate">{gym.name}</h1>
            <p className="text-xs text-slate-500">{gym.address || 'No address on file'}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant={gym.status === 'active' ? 'success' : 'danger'}>{gym.status}</Badge>
            <Link href="/super-admin"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-700/20 text-violet-300 border border-violet-500/30 rounded-xl text-xs font-medium hover:bg-violet-700/30 transition-all">
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </div>
        </div>

        {/* ── Stat cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Members',          value: stats.memberCount,         icon: Users,         color: 'blue'    },
            { label: 'Active',           value: stats.activeMemberCount,   icon: UserCheck,     color: 'emerald' },
            { label: 'Workouts',         value: stats.workoutCount,        icon: Dumbbell,      color: 'red'     },
            { label: 'Attend (month)',   value: stats.attendanceThisMonth, icon: CalendarCheck, color: 'amber'   },
            { label: 'Posts',            value: stats.postCount,           icon: ImageIcon,     color: 'rose'    },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-xl flex-shrink-0 bg-${color}-500/10 text-${color}-400`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 truncate">{label}</p>
                <p className="text-xl font-bold text-white tabular-nums">{value.toLocaleString()}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Charts row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          {/* Member growth */}
          <div className="bg-[#0f0f0f] border border-white/8 rounded-2xl p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">New Members / Month</h2>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={growthChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={false} name="New Members" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Attendance trend */}
          <div className="bg-[#0f0f0f] border border-white/8 rounded-2xl p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Attendance Trend</h2>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} dot={false} name="Check-ins" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Workout activity */}
          <div className="bg-[#0f0f0f] border border-white/8 rounded-2xl p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Workout Activity</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={workoutsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#E11D1D" radius={[4, 4, 0, 0]} name="Workouts" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Bottom row: subscription + top users ────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Subscription card */}
          <div className="bg-[#0f0f0f] border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Subscription</h2>
            </div>
            {subscription ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Plan</span>
                  <span className="text-xs font-medium text-slate-200 capitalize">{subscription.plan_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Status</span>
                  <Badge variant={subBadgeVariant(subscription.status)}>{subscription.status}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Start</span>
                  <span className="text-xs text-slate-400">{formatDate(subscription.start_date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Renewal</span>
                  <span className="text-xs text-slate-400">
                    {subscription.renewal_date ? formatDate(subscription.renewal_date) : '—'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-600 text-sm">No subscription on record</p>
            )}

            <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Gym created</span>
                <span className="text-xs text-slate-400">{formatDate(gym.created_at)}</span>
              </div>
              {gym.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Phone</span>
                  <span className="text-xs text-slate-400">{gym.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Top users */}
          <div className="md:col-span-2 bg-[#0f0f0f] border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Most Active Members</h2>
              <span className="ml-auto text-xs text-slate-500">by attendance</span>
            </div>
            <div className="divide-y divide-white/5">
              {topUsers.length > 0 ? topUsers.map((u, i) => (
                <div key={u.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 font-mono w-5 text-right">{i + 1}.</span>
                    <div>
                      <p className="text-sm font-medium text-white">{u.name || '—'}</p>
                      <p className="text-xs text-slate-500 font-mono">{u.phone}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-violet-400 tabular-nums">{u.count} check-ins</span>
                </div>
              )) : (
                <p className="px-4 py-8 text-center text-slate-600 text-sm">No attendance data yet</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
