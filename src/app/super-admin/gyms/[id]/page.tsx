'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Building2, Users, UserCheck, Dumbbell,
  CalendarCheck, ImageIcon, Shield, CreditCard, Brain, CheckCircle2, XCircle,
  Search, ChevronLeft, ChevronRight, ExternalLink,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import DarkSelect from '@/components/ui/DarkSelect';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AiAnalyticsData {
  consent_summary: { consented: number; declined: number; total: number };
  weekly_trends: {
    week: string;
    members_active: number;
    avg_sessions: number;
    avg_volume_kg: number;
    avg_adherence_pct: number;
    total_attendance: number;
  }[];
  strength_trends: {
    exercise: string;
    weekly_data: { week: string; avg_top_weight: number; avg_volume: number }[];
  }[];
  profile_distribution: {
    by_goal:       { label: string; count: number }[];
    by_experience: { label: string; count: number }[];
  };
}

interface MemberRow {
  member_id: string;
  assigned_plan: string | null;
  plan_source: string | null;
  adherence_percent: number | null;
  last_active_date: string | null;
}

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

  const [data, setData]           = useState<GymDetailData | null>(null);
  const [aiData, setAiData]       = useState<AiAnalyticsData | null>(null);
  const [loading, setLoading]     = useState(true);

  // Member explorer
  const [members, setMembers]     = useState<MemberRow[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersPage, setMembersPage]   = useState(0);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch]     = useState('');
  const [planFilter, setPlanFilter]         = useState('');
  const [adherenceFilter, setAdherenceFilter] = useState<'all' | 'high' | 'low'>('all');

  useEffect(() => {
    if (!gymId) return;
    Promise.all([
      fetch(`/api/super-admin/gyms/${gymId}`),
      fetch(`/api/super-admin/ai-analytics?gym_id=${gymId}`),
    ]).then(async ([gymRes, aiRes]) => {
      if (gymRes.status === 401 || gymRes.status === 403) {
        router.push('/super-admin-login');
        return;
      }
      if (!gymRes.ok) { router.push('/super-admin'); return; }
      const gymJson = await gymRes.json();
      setData(gymJson);
      if (aiRes.ok) setAiData(await aiRes.json());
      setLoading(false);
    });
  }, [gymId]);

  async function fetchMembers(page = 0, search = memberSearch, plan = planFilter, adh = adherenceFilter) {
    if (!gymId) return;
    setMembersLoading(true);
    const minAdh = adh === 'high' ? 70 : 0;
    const maxAdh = adh === 'low'  ? 50 : 100;
    const url = `/api/super-admin/ai-analytics/members?gym_id=${gymId}&page=${page}&search=${encodeURIComponent(search)}&plan=${encodeURIComponent(plan)}&min_adherence=${minAdh}&max_adherence=${maxAdh}`;
    const res = await fetch(url);
    if (res.ok) {
      const d = await res.json();
      setMembers(d.members ?? []);
      setMembersTotal(d.total ?? 0);
      setMembersPage(page);
    }
    setMembersLoading(false);
  }

  // Load members once gym data is available
  useEffect(() => {
    if (gymId && !loading) fetchMembers(0);
  }, [gymId, loading]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const { gym, subscription, stats, trends } = data;

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

        {/* ── AI Analytics Section ────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-widest">AI Data Foundation</h2>
            <span className="text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full ml-1">Anonymised · No PII</span>
          </div>

          {/* Consent summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-[#0f0f0f] border border-white/8 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500">AI Consented</p>
                <p className="text-xl font-bold text-white tabular-nums">{aiData?.consent_summary.consented ?? '—'}</p>
              </div>
            </div>
            <div className="bg-[#0f0f0f] border border-white/8 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10">
                <XCircle className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Declined / Withdrawn</p>
                <p className="text-xl font-bold text-white tabular-nums">{aiData?.consent_summary.declined ?? '—'}</p>
              </div>
            </div>
            <div className="bg-[#0f0f0f] border border-white/8 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-500/10">
                <Brain className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Total in Dataset</p>
                <p className="text-xl font-bold text-white tabular-nums">{aiData?.consent_summary.total ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Weekly training trends from AI dataset */}
          {aiData && aiData.weekly_trends.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-[#0f0f0f] border border-white/8 rounded-2xl p-4">
                <h3 className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">Avg Weekly Volume (kg) — AI Cohort</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={aiData.weekly_trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line type="monotone" dataKey="avg_volume_kg" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Avg Volume (kg)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[#0f0f0f] border border-white/8 rounded-2xl p-4">
                <h3 className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">Avg Adherence % — AI Cohort</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={aiData.weekly_trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Adherence']} />
                    <Line type="monotone" dataKey="avg_adherence_pct" stroke="#10b981" strokeWidth={2} dot={false} name="Adherence %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Profile distribution */}
          {aiData && (aiData.profile_distribution.by_goal.length > 0 || aiData.profile_distribution.by_experience.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiData.profile_distribution.by_goal.length > 0 && (
                <div className="bg-[#0f0f0f] border border-white/8 rounded-2xl p-4">
                  <h3 className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">Goals Distribution</h3>
                  <div className="space-y-2">
                    {aiData.profile_distribution.by_goal.map(({ label, count }) => {
                      const total = aiData.profile_distribution.by_goal.reduce((s, x) => s + x.count, 0);
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 capitalize">{label.replace(/_/g, ' ')}</span>
                            <span className="text-slate-500">{count}</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-600 rounded-full" style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {aiData.profile_distribution.by_experience.length > 0 && (
                <div className="bg-[#0f0f0f] border border-white/8 rounded-2xl p-4">
                  <h3 className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">Experience Levels</h3>
                  <div className="space-y-2">
                    {aiData.profile_distribution.by_experience.map(({ label, count }) => {
                      const total = aiData.profile_distribution.by_experience.reduce((s, x) => s + x.count, 0);
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 capitalize">{label}</span>
                            <span className="text-slate-500">{count}</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {aiData && aiData.consent_summary.total === 0 && (
            <div className="bg-[#0f0f0f] border border-dashed border-white/10 rounded-2xl p-8 text-center">
              <Brain className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No AI dataset entries yet.</p>
              <p className="text-xs text-slate-700 mt-1">Data will appear here once members accept the Terms & AI consent.</p>
            </div>
          )}
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

        </div>

        {/* ── Member Explorer ──────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-widest">Member Explorer</h2>
            <span className="text-[10px] text-slate-500 ml-auto">UUID only · No PII</span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchMembers(0, memberSearch, planFilter, adherenceFilter)}
                placeholder="Search UUID…"
                className="pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 w-44"
              />
            </div>
            <DarkSelect
              value={planFilter}
              onChange={(v) => { setPlanFilter(v); fetchMembers(0, memberSearch, v, adherenceFilter); }}
              options={[
                { value: '',              label: 'All Plans'      },
                { value: 'push_pull_legs', label: 'PPL'           },
                { value: 'full_body',      label: 'Full Body'     },
                { value: 'upper_lower',    label: 'Upper / Lower' },
                { value: 'custom',         label: 'Custom'        },
              ]}
            />
            <DarkSelect
              value={adherenceFilter}
              onChange={(v) => { setAdherenceFilter(v as 'all'|'high'|'low'); fetchMembers(0, memberSearch, planFilter, v as 'all'|'high'|'low'); }}
              options={[
                { value: 'all',  label: 'All Adherence' },
                { value: 'high', label: 'High ≥70%'     },
                { value: 'low',  label: 'Low ≤50%'      },
              ]}
            />
            <button
              onClick={() => fetchMembers(0, memberSearch, planFilter, adherenceFilter)}
              className="px-3 py-1.5 bg-violet-700/30 hover:bg-violet-700/50 text-violet-300 border border-violet-500/30 rounded-lg text-xs transition-all"
            >
              Search
            </button>
          </div>

          <div className="bg-[#0f0f0f] border border-white/8 rounded-2xl overflow-hidden">
            {membersLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-slate-500 text-sm">No consented members in AI dataset yet.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b border-white/5">
                      <tr>
                        {['Member ID (UUID)', 'Plan', 'Source', 'Adherence', 'Last Active', ''].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {members.map((m) => (
                        <tr key={m.member_id} className="hover:bg-violet-500/5 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-300 text-[11px]">
                            {m.member_id.slice(0, 8)}…{m.member_id.slice(-6)}
                          </td>
                          <td className="px-4 py-3 text-slate-300 capitalize">
                            {m.assigned_plan?.replace(/_/g, ' ') ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            {m.plan_source ? (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${m.plan_source === 'admin' ? 'bg-violet-500/15 text-violet-400' : 'bg-slate-700 text-slate-400'}`}>
                                {m.plan_source}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {m.adherence_percent !== null ? (
                              <span className={`font-semibold tabular-nums ${m.adherence_percent >= 80 ? 'text-emerald-400' : m.adherence_percent >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                                {Math.round(m.adherence_percent)}%
                              </span>
                            ) : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {m.last_active_date
                              ? new Date(m.last_active_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/super-admin/ai/member/${m.member_id}?gym_id=${gymId}`}
                              className="flex items-center gap-1 text-slate-600 hover:text-violet-400 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {membersTotal > 50 && (
                  <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {membersPage * 50 + 1}–{Math.min((membersPage + 1) * 50, membersTotal)} of {membersTotal}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => fetchMembers(membersPage - 1)} disabled={membersPage === 0} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={() => fetchMembers(membersPage + 1)} disabled={(membersPage + 1) * 50 >= membersTotal} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
