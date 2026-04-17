'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Brain, Target, Zap, Calendar, BarChart2, TrendingUp,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Card } from '@/components/ui/Card';

// ── Types ─────────────────────────────────────────────────────────────────────
interface MemberProfile {
  member_id: string;
  gym_id: string | null;
  goal: string | null;
  experience_level: string | null;
  height_cm: number | null;
  baseline_weight_kg: number | null;
  consent_enabled: boolean;
}
interface WeeklyLog {
  week_start: string;
  sessions_completed: number;
  weekly_minutes: number;
  weekly_volume: number;
  adherence_percent: number;
  weight_kg: number | null;
  avg_progression_score: number;
  attendance_count: number;
  assigned_plan: string | null;
  plan_source: string | null;
  top_exercises: unknown;
}
interface ExerciseSeries {
  name: string;
  data: { week: string; top_weight: number; estimated_1rm: number | null }[];
}
interface MemberDetail {
  profile: MemberProfile;
  weekly_logs: WeeklyLog[];
  exercise_progress: ExerciseSeries[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const TT: React.CSSProperties = { background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12, color: '#e2e8f0' };
const DOT = { r: 3, fill: 'currentColor', strokeWidth: 0 };

function fmtWeek(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
}
function shortId(id: string) {
  return id.slice(0, 8) + '…' + id.slice(-4);
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MemberDetailPage() {
  const router       = useRouter();
  const params       = useParams<{ memberId: string }>();
  const searchParams = useSearchParams();
  const gymId        = searchParams.get('gym_id') ?? '';
  const memberId     = params?.memberId ?? '';

  const [data, setData]       = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!memberId) return;
    fetch(`/api/super-admin/ai-analytics/member/${memberId}`)
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) { router.push('/super-admin-login'); return; }
        if (!res.ok) { setError('Member not found in AI dataset'); setLoading(false); return; }
        setData(await res.json());
        setLoading(false);
      })
      .catch(() => { setError('Failed to load data'); setLoading(false); });
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error || !data) return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center">
      <p className="text-red-400">{error || 'No data'}</p>
    </div>
  );

  const { profile, weekly_logs, exercise_progress } = data;
  const backHref = gymId ? `/super-admin/gyms/${gymId}` : '/super-admin';

  // Prepare chart data
  const weeklyChartData = weekly_logs.map((w) => ({
    week:       fmtWeek(w.week_start),
    sessions:   w.sessions_completed ?? 0,
    volume:     Math.round(w.weekly_volume ?? 0),
    adherence:  Math.round(w.adherence_percent ?? 0),
    weight:     w.weight_kg ?? null,
    progression: Math.round((w.avg_progression_score ?? 0) * 10) / 10,
  }));

  return (
    <div className="min-h-screen bg-[#000000] p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <Link href={backHref} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 bg-violet-700/30 border border-violet-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white font-mono truncate">
              {shortId(profile.member_id)}
            </h1>
            <p className="text-xs text-slate-500">Anonymised AI Dataset · No PII</p>
          </div>
          <span className="ml-auto text-[10px] bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-1 rounded-full">
            UUID only
          </span>
        </div>

        {/* ── Profile cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Goal',         value: profile.goal?.replace(/_/g, ' ') || '—',        icon: Target,     color: 'violet' },
            { label: 'Experience',   value: profile.experience_level || '—',                  icon: Zap,        color: 'amber'  },
            { label: 'Height',       value: profile.height_cm ? `${profile.height_cm} cm` : '—', icon: BarChart2, color: 'blue'   },
            { label: 'Base Weight',  value: profile.baseline_weight_kg ? `${profile.baseline_weight_kg} kg` : '—', icon: TrendingUp, color: 'emerald' },
            { label: 'Weeks Logged', value: weekly_logs.length,                              icon: Calendar,   color: 'rose'   },
            { label: 'Exercises',    value: exercise_progress.length,                         icon: Brain,      color: 'slate'  },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="p-3 flex items-center gap-2">
              <div className={`p-1.5 rounded-lg shrink-0 bg-${color}-500/10 text-${color}-400`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500">{label}</p>
                <p className="text-sm font-bold text-white capitalize leading-tight truncate">{String(value)}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Charts grid ──────────────────────────────────────────────────── */}
        {weeklyChartData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

            {/* Sessions per week */}
            <ChartCard title="Weekly Sessions" color="#8b5cf6">
              <LineChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TT} />
                <Line type="monotone" dataKey="sessions" stroke="#8b5cf6" strokeWidth={2} dot={DOT} activeDot={{ r: 5 }} name="Sessions" />
              </LineChart>
            </ChartCard>

            {/* Weekly volume */}
            <ChartCard title="Weekly Volume (kg)" color="#E11D1D">
              <LineChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} />
                <Line type="monotone" dataKey="volume" stroke="#E11D1D" strokeWidth={2} dot={DOT} activeDot={{ r: 5 }} name="Volume (kg)" />
              </LineChart>
            </ChartCard>

            {/* Adherence */}
            <ChartCard title="Adherence %" color="#10b981">
              <LineChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={TT} formatter={(v) => [`${v}%`, 'Adherence']} />
                <Line type="monotone" dataKey="adherence" stroke="#10b981" strokeWidth={2} dot={DOT} activeDot={{ r: 5 }} name="Adherence %" />
              </LineChart>
            </ChartCard>

            {/* Weight trend */}
            {weeklyChartData.some((d) => d.weight !== null) && (
              <ChartCard title="Weight Trend (kg)" color="#f59e0b">
                <LineChart data={weeklyChartData.filter((d) => d.weight !== null)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                  <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={TT} />
                  <Line type="monotone" dataKey="weight" stroke="#f59e0b" strokeWidth={2} dot={DOT} activeDot={{ r: 5 }} name="Weight (kg)" />
                </LineChart>
              </ChartCard>
            )}
          </div>
        )}

        {/* ── Strength progress per exercise ───────────────────────────────── */}
        {exercise_progress.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Strength Progress</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exercise_progress.slice(0, 6).map((ex) => (
                <div key={ex.name} className="bg-[#0f0f0f] border border-white/8 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-slate-300 mb-3 truncate">{ex.name}</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={ex.data.map((d) => ({ week: fmtWeek(d.week), weight: d.top_weight, e1rm: d.estimated_1rm }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                      <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 8 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 8 }} axisLine={false} tickLine={false} unit="kg" />
                      <Tooltip contentStyle={TT} />
                      <Line type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={2} dot={DOT} name="Top Weight" />
                      {ex.data.some((d) => d.estimated_1rm !== null) && (
                        <Line type="monotone" dataKey="e1rm" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Est. 1RM" />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Weekly logs table ─────────────────────────────────────────────── */}
        {weekly_logs.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-violet-400" />
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Weekly Logs</h2>
              <span className="text-[10px] text-slate-600 ml-auto">{weekly_logs.length} weeks</span>
            </div>
            <div className="bg-[#0f0f0f] border border-white/8 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-white/5">
                    <tr>
                      {['Week', 'Sessions', 'Minutes', 'Volume (kg)', 'Adherence', 'Plan'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[...weekly_logs].reverse().map((log) => (
                      <tr key={log.week_start} className="hover:bg-white/2 transition-colors">
                        <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">{fmtWeek(log.week_start)}</td>
                        <td className="px-4 py-2.5 tabular-nums text-white font-medium">{log.sessions_completed ?? '—'}</td>
                        <td className="px-4 py-2.5 tabular-nums text-slate-400">{log.weekly_minutes ?? '—'}</td>
                        <td className="px-4 py-2.5 tabular-nums text-slate-300">{log.weekly_volume ? Math.round(log.weekly_volume) : '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`font-semibold tabular-nums ${
                            (log.adherence_percent ?? 0) >= 80 ? 'text-emerald-400' :
                            (log.adherence_percent ?? 0) >= 50 ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {log.adherence_percent !== null ? `${Math.round(log.adherence_percent)}%` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 capitalize">
                          {log.assigned_plan?.replace(/_/g, ' ') ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {weekly_logs.length === 0 && exercise_progress.length === 0 && (
          <Card className="p-10 text-center">
            <p className="text-slate-500 text-sm">No training data logged yet for this member.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Reusable chart wrapper ────────────────────────────────────────────────────
function ChartCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0f0f0f] border border-white/8 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
        <p className="text-xs font-semibold text-slate-400">{title}</p>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}
