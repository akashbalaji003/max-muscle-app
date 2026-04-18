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
        router.push('/login');
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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#000000] px-4 text-white">
        <style>{`
          @keyframes fade-up {
            from { opacity: 0; transform: translateY(20px); }
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

          @keyframes loader-progress {
            from { transform: scaleX(0); }
            to { transform: scaleX(1); }
          }
        `}</style>

        <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-600/6 blur-[140px]" />
          <div className="absolute bottom-[-120px] right-[-90px] h-[460px] w-[460px] rounded-full bg-indigo-700/5 blur-[140px]" />
          <div className="absolute left-[-120px] top-1/2 h-[420px] w-[420px] rounded-full bg-purple-800/4 blur-[150px]" />
        </div>

        <div className="relative flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10" style={{ animation: 'glow-pulse 3s ease-in-out infinite' }}>
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-violet-400" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8Z" />
            </svg>
          </div>
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/5">
            <div className="h-full w-[85%] origin-left rounded-full bg-violet-600" style={{ animation: 'loader-progress 2s ease-out forwards' }} />
          </div>
          <p className="mt-4 font-display text-xs uppercase tracking-widest text-slate-500">
            Loading gym data…
          </p>
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

      <div className="relative mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-white/5 bg-[#050505]/70 px-4 py-4 backdrop-blur-xl">
          <Link
            href="/super-admin"
            className="rounded-xl border border-white/6 bg-white/4 p-2.5 text-slate-400 transition-all hover:border-violet-500/20 hover:bg-violet-500/10 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10" style={{ animation: 'glow-pulse 3s ease-in-out infinite' }}>
            <Building2 className="h-5 w-5 text-violet-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl tracking-wide text-white leading-tight">{gym.name}</h1>
            <p className="text-xs text-slate-500">{gym.address || 'No address on file'}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant={gym.status === 'active' ? 'success' : 'danger'}>{gym.status}</Badge>
            <Link
              href="/super-admin"
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 font-display text-xs tracking-wide text-violet-300 transition-all hover:bg-violet-500/15"
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: 'Members', value: stats.memberCount, icon: Users, color: 'blue' },
            { label: 'Active', value: stats.activeMemberCount, icon: UserCheck, color: 'emerald' },
            { label: 'Workouts', value: stats.workoutCount, icon: Dumbbell, color: 'red' },
            { label: 'Attend (month)', value: stats.attendanceThisMonth, icon: CalendarCheck, color: 'amber' },
            { label: 'Posts', value: stats.postCount, icon: ImageIcon, color: 'rose' },
          ].map(({ label, value, icon: Icon, color }, index) => (
            <Card
              key={label}
              className="group flex items-center gap-3 rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-500/20"
              style={{ animation: 'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both', animationDelay: `${index * 80}ms` }}
            >
              <div className={`rounded-xl p-2.5 flex-shrink-0 bg-${color}-500/10 text-${color}-400 transition-transform duration-300 group-hover:scale-110`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 leading-tight whitespace-normal break-words">{label}</p>
                <p className="text-2xl font-black text-white tabular-nums" style={{ animation: 'count-in 0.4s ease both', animationDelay: `${index * 80 + 80}ms` }}>{value.toLocaleString()}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 transition-all duration-300 hover:border-violet-500/15" style={{ animation: 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 0ms both' }}>
            <div className="mb-4 flex items-center gap-2 border-l-2 border-violet-500 pl-3">
              <Users className="h-4 w-4 flex-shrink-0 text-violet-400" />
              <h2 className="font-display text-sm tracking-wide text-white">New Members / Month</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={growthChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 10, fontSize: 12, color: '#e2e8f0', padding: '8px 12px' }} />
                <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={false} name="New Members" animationDuration={1000} animationEasing="ease-out" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 transition-all duration-300 hover:border-violet-500/15" style={{ animation: 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 150ms both' }}>
            <div className="mb-4 flex items-center gap-2 border-l-2 border-amber-500 pl-3">
              <CalendarCheck className="h-4 w-4 flex-shrink-0 text-violet-400" />
              <h2 className="font-display text-sm tracking-wide text-white">Attendance Trend</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 10, fontSize: 12, color: '#e2e8f0', padding: '8px 12px' }} />
                <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} dot={false} name="Check-ins" animationDuration={1000} animationEasing="ease-out" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 transition-all duration-300 hover:border-violet-500/15" style={{ animation: 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 300ms both' }}>
            <div className="mb-4 flex items-center gap-2 border-l-2 border-red-500 pl-3">
              <Dumbbell className="h-4 w-4 flex-shrink-0 text-violet-400" />
              <h2 className="font-display text-sm tracking-wide text-white">Workout Activity</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={workoutsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 10, fontSize: 12, color: '#e2e8f0', padding: '8px 12px' }} />
                <Bar dataKey="count" fill="#E11D1D" radius={[4, 4, 0, 0]} name="Workouts" animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Analytics */}
        <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-400" />
            <h2 className="font-display text-sm uppercase tracking-widest text-white">AI Data Foundation</h2>
            <span className="ml-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-400">Anonymised · No PII</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: 'AI Consented', value: aiData?.consent_summary.consented ?? '—', icon: CheckCircle2, color: 'emerald' },
              { label: 'Declined / Withdrawn', value: aiData?.consent_summary.declined ?? '—', icon: XCircle, color: 'rose' },
              { label: 'Total in Dataset', value: aiData?.consent_summary.total ?? '—', icon: Brain, color: 'violet' },
            ].map(({ label, value, icon: Icon, color }, index) => (
              <Card
                key={label}
                className="group flex items-center gap-3 rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-500/20"
                style={{ animation: 'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both', animationDelay: `${400 + index * 80}ms` }}
              >
                <div className={`rounded-xl p-2.5 shrink-0 bg-${color}-500/10 text-${color}-400 transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500">{label}</p>
                  <p className="text-2xl font-black text-white tabular-nums" style={{ animation: 'count-in 0.4s ease both', animationDelay: `${480 + index * 80}ms` }}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
                </div>
              </Card>
            ))}
          </div>

          {aiData && aiData.weekly_trends.length > 0 && (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div style={{ animation: 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 0ms both' }}>
                <AiLineCard title="Avg Weekly Volume (kg) — AI Cohort" color="#8b5cf6">
                  <LineChart data={aiData.weekly_trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 10, fontSize: 12, color: '#e2e8f0', padding: '8px 12px' }} />
                    <Line type="monotone" dataKey="avg_volume_kg" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Avg Volume (kg)" animationDuration={900} animationEasing="ease-out" />
                  </LineChart>
                </AiLineCard>
              </div>

              <div style={{ animation: 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 100ms both' }}>
                <AiLineCard title="Avg Adherence % — AI Cohort" color="#10b981">
                  <LineChart data={aiData.weekly_trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                    <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 10, fontSize: 12, color: '#e2e8f0', padding: '8px 12px' }} formatter={(v) => [`${v}%`, 'Adherence']} />
                    <Line type="monotone" dataKey="avg_adherence_pct" stroke="#10b981" strokeWidth={2} dot={false} name="Adherence %" animationDuration={900} animationEasing="ease-out" />
                  </LineChart>
                </AiLineCard>
              </div>
            </div>
          )}

          {aiData && (aiData.profile_distribution.by_goal.length > 0 || aiData.profile_distribution.by_experience.length > 0) && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {aiData.profile_distribution.by_goal.length > 0 && (
                <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 transition-all duration-300 hover:border-violet-500/15" style={{ animation: 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 200ms both' }}>
                  <h3 className="mb-3 font-display text-xs tracking-wide text-slate-400">Goals Distribution</h3>
                  <div className="space-y-2">
                    {aiData.profile_distribution.by_goal.map(({ label, count }) => {
                      const total = aiData.profile_distribution.by_goal.reduce((s, x) => s + x.count, 0);
                      return (
                        <div key={label}>
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="capitalize text-slate-300">{label.replace(/_/g, ' ')}</span>
                            <span className="text-slate-500">{count}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                            <div className="h-full rounded-full bg-violet-600" style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {aiData.profile_distribution.by_experience.length > 0 && (
                <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 transition-all duration-300 hover:border-violet-500/15" style={{ animation: 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 300ms both' }}>
                  <h3 className="mb-3 font-display text-xs tracking-wide text-slate-400">Experience Levels</h3>
                  <div className="space-y-2">
                    {aiData.profile_distribution.by_experience.map(({ label, count }) => {
                      const total = aiData.profile_distribution.by_experience.reduce((s, x) => s + x.count, 0);
                      return (
                        <div key={label}>
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="capitalize text-slate-300">{label}</span>
                            <span className="text-slate-500">{count}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                            <div className="h-full rounded-full bg-emerald-600" style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {aiData && aiData.consent_summary.total === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#0a0a0a] p-8 text-center">
              <Brain className="mx-auto mb-3 h-8 w-8 text-slate-700" />
              <p className="text-sm text-slate-500">No AI dataset entries yet.</p>
              <p className="mt-1 text-xs text-slate-700">Data will appear here once members accept the Terms & AI consent.</p>
            </div>
          )}
        </div>

        {/* Subscription card */}
        <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 transition-all duration-300 hover:border-violet-500/15">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-violet-400" />
            <h2 className="font-display text-sm tracking-wide text-white">Subscription</h2>
          </div>
          {subscription ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Plan</span>
                <span className="text-xs capitalize text-slate-200">{subscription.plan_name}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Status</span>
                <Badge variant={subBadgeVariant(subscription.status)}>{subscription.status}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Start</span>
                <span className="text-xs text-slate-400">{formatDate(subscription.start_date)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Renewal</span>
                <span className="text-xs text-slate-400">{subscription.renewal_date ? formatDate(subscription.renewal_date) : '—'}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">No subscription on record</p>
          )}

          <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">Gym created</span>
              <span className="text-xs text-slate-400">{formatDate(gym.created_at)}</span>
            </div>
            {gym.phone && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Phone</span>
                <span className="text-xs text-slate-400">{gym.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Member Explorer */}
        <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-400" />
            <h2 className="font-display text-sm uppercase tracking-widest text-white">Member Explorer</h2>
            <span className="ml-auto text-[10px] text-slate-500">UUID only · No PII</span>
          </div>

          <div className="mb-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchMembers(0, memberSearch, planFilter, adherenceFilter)}
                placeholder="Search UUID…"
                className="h-[42px] w-full rounded-xl border border-white/8 bg-[#000] py-2.5 pl-8 pr-3 text-sm text-slate-300 placeholder:text-slate-600 transition-all focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
              />
            </div>
            <DarkSelect
              value={planFilter}
              onChange={(v) => { setPlanFilter(v); fetchMembers(0, memberSearch, v, adherenceFilter); }}
              className="w-full min-w-[128px] lg:w-auto"
              options={[
                { value: '', label: 'All Plans' },
                { value: 'push_pull_legs', label: 'PPL' },
                { value: 'full_body', label: 'Full Body' },
                { value: 'upper_lower', label: 'Upper / Lower' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
            <DarkSelect
              value={adherenceFilter}
              onChange={(v) => { setAdherenceFilter(v as 'all'|'high'|'low'); fetchMembers(0, memberSearch, planFilter, v as 'all'|'high'|'low'); }}
              className="w-full min-w-[128px] lg:w-auto"
              options={[
                { value: 'all', label: 'All Adherence' },
                { value: 'high', label: 'High ≥70%' },
                { value: 'low', label: 'Low ≤50%' },
              ]}
            />
            <button
              onClick={() => fetchMembers(0, memberSearch, planFilter, adherenceFilter)}
              className="h-[42px] rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 text-xs text-violet-300 transition-all hover:bg-violet-500/15 lg:justify-self-end"
            >
              Search
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/6 bg-[#0a0a0a]">
            {membersLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              </div>
            ) : members.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-slate-500">No consented members in AI dataset yet.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b border-white/5 bg-[#050505]">
                      <tr>
                        {['Member ID (UUID)', 'Plan', 'Source', 'Adherence', 'Last Active', ''].map((h) => (
                          <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {members.map((m) => (
                        <tr key={m.member_id} className="transition-colors duration-150 hover:bg-violet-500/5">
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                            {m.member_id.slice(0, 8)}…{m.member_id.slice(-6)}
                          </td>
                          <td className="px-4 py-3 capitalize text-slate-300">
                            {m.assigned_plan?.replace(/_/g, ' ') ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            {m.plan_source ? (
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${m.plan_source === 'admin' ? 'bg-violet-500/15 text-violet-400' : 'bg-slate-700 text-slate-400'}`}>
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
                            {m.last_active_date ? new Date(m.last_active_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/super-admin/ai/member/${m.member_id}?gym_id=${gymId}`}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 transition-all hover:bg-violet-500/10 hover:text-violet-400"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {membersTotal > 50 && (
                  <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
                    <span className="text-xs text-slate-500">
                      {membersPage * 50 + 1}–{Math.min((membersPage + 1) * 50, membersTotal)} of {membersTotal}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => fetchMembers(membersPage - 1)} disabled={membersPage === 0} className="rounded-lg border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition-all hover:border-violet-500/20 hover:text-violet-300 disabled:opacity-30">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button onClick={() => fetchMembers(membersPage + 1)} disabled={(membersPage + 1) * 50 >= membersTotal} className="rounded-lg border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition-all hover:border-violet-500/20 hover:text-violet-300 disabled:opacity-30">
                        <ChevronRight className="h-4 w-4" />
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

// ── Small chart wrapper ───────────────────────────────────────────────────────
function AiLineCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-5 transition-all duration-300 hover:border-violet-500/15">
      <div className="mb-3 flex items-center gap-2 border-l-2 pl-3" style={{ borderLeftColor: color }}>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <p className="font-display text-xs tracking-wide text-slate-400">{title}</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}
