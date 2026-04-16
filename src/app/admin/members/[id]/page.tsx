'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, User, Calendar, Activity, Flame, Scale,
  Dumbbell, TrendingUp, BarChart2, Download, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { isMembershipActive, daysRemaining } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberData {
  user: {
    id: string; name: string | null; phone_number: string;
    created_at: string; height_cm: number | null; weight_kg: number | null;
  };
  membership: {
    start_date: string; end_date: string; active: boolean;
    joined_on: string | null;
  } | null;
  attendance: { date: string; checked_in_at: string }[];
  workouts: {
    id: string; date: string; duration_seconds: number | null;
    workout_type: string | null;
    workout_entries: {
      weight: number; reps: number; sets: number;
      exercises: { name: string; muscle_group: string | null; category: string } | null;
    }[];
  }[];
  weightLogs: { weight_kg: number; logged_at: string }[];
}

// ─── Colour palette for charts ────────────────────────────────────────────────
const COLOURS = ['#E11D1D', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function fmtShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...dates].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  let streak = 0;
  let expected = today;
  for (const d of sorted) {
    if (d === expected) {
      streak++;
      const prev = new Date(expected);
      prev.setDate(prev.getDate() - 1);
      expected = prev.toISOString().split('T')[0];
    } else if (d < expected) break;
  }
  return streak;
}

function workoutsPerWeek(workouts: MemberData['workouts']) {
  const map: Record<string, number> = {};
  for (const w of workouts) {
    const d = new Date(w.date);
    // ISO week start (Monday)
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    const week = d.toISOString().split('T')[0];
    map[week] = (map[week] || 0) + 1;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([week, count]) => ({ week: fmt(week), count }));
}

function strengthProgress(workouts: MemberData['workouts']) {
  const map: Record<string, { date: string; weight: number }[]> = {};
  for (const w of workouts) {
    for (const e of w.workout_entries) {
      if (!e.exercises || !e.weight) continue;
      const name = e.exercises.name;
      if (!map[name]) map[name] = [];
      map[name].push({ date: fmtShort(w.date), weight: e.weight });
    }
  }
  // Only exercises with ≥ 2 data points
  return Object.entries(map)
    .filter(([, pts]) => pts.length >= 2)
    .slice(0, 6) // max 6 exercises
    .map(([name, data]) => ({ name, data: data.slice(-12) }));
}

function muscleDistribution(workouts: MemberData['workouts']) {
  const map: Record<string, number> = {};
  for (const w of workouts) {
    for (const e of w.workout_entries) {
      const mg = e.exercises?.muscle_group || e.exercises?.category || 'Other';
      map[mg] = (map[mg] || 0) + 1;
    }
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));
}

function topExercises(workouts: MemberData['workouts'], n = 5) {
  const map: Record<string, number> = {};
  for (const w of workouts) {
    for (const e of w.workout_entries) {
      const name = e.exercises?.name;
      if (!name) continue;
      map[name] = (map[name] || 0) + 1;
    }
  }
  return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, n);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemberAnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;

  const [data, setData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/members/${userId}`);
    if (res.status === 403) { router.push('/admin/login'); return; }
    if (!res.ok) { setError('Failed to load member data'); setLoading(false); return; }
    setData(await res.json());
    setLoading(false);
  }, [userId, router]);

  useEffect(() => { load(); }, [load]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <p className="text-red-400">{error || 'Member not found'}</p>
      </div>
    );
  }

  const { user, membership, attendance, workouts, weightLogs } = data;

  // ── Derived data ────────────────────────────────────────────────────────
  const membershipActive = membership ? isMembershipActive(membership.end_date) : false;
  const joinDate = membership?.joined_on || membership?.start_date || user.created_at;
  const daysSinceJoin = Math.floor((Date.now() - new Date(joinDate).getTime()) / 86_400_000);
  const streak = calcStreak(attendance.map((a) => a.date));
  const totalMinutes = workouts.reduce((s, w) => s + Math.round((w.duration_seconds || 0) / 60), 0);

  const weeklyData = workoutsPerWeek(workouts);
  const strengthData = strengthProgress(workouts);
  const muscleData = muscleDistribution(workouts);
  const top5 = topExercises(workouts);
  const mostMuscle = muscleData[0]?.name || '—';

  const weightData = weightLogs.map((w) => ({
    date: fmt(w.logged_at),
    weight: w.weight_kg,
  }));

  // BMI
  const bmi =
    user.height_cm && user.weight_kg
      ? Math.round((user.weight_kg / Math.pow(user.height_cm / 100, 2)) * 10) / 10
      : null;

  const bmiData = weightLogs.map((w) => ({
    date: fmt(w.logged_at),
    bmi: user.height_cm
      ? Math.round((w.weight_kg / Math.pow(user.height_cm / 100, 2)) * 10) / 10
      : null,
  })).filter((d) => d.bmi !== null);

  const daysLeft = membership ? daysRemaining(membership.end_date) : null;

  return (
    <>
      {/* ── Print styles ─────────────────────────────────────────────── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-card {
            border: 1px solid #ddd !important;
            background: white !important;
            break-inside: avoid;
          }
          h2, h3, p, span { color: black !important; }
        }
      `}</style>

      <div className="admin-shell min-h-screen bg-[#000000] p-4 md:p-6">
        <div className="max-w-5xl mx-auto">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-6 gap-3 no-print">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard"
                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
                <ArrowLeft className="w-4 h-4" /> Dashboard
              </Link>
              <span className="text-slate-700">/</span>
              <span className="text-slate-300 text-sm font-medium">{user.name || user.phone_number}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load}
                className="p-2 text-slate-400 hover:text-white transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-700 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-all">
                <Download className="w-3.5 h-3.5" /> Download Report
              </button>
            </div>
          </div>

          {/* ── SECTION A — Overview ────────────────────────────────────── */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Overview</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                {
                  label: 'Member', icon: User, color: 'text-slate-300',
                  value: user.name || '—',
                  sub: user.phone_number,
                },
                {
                  label: 'Member Since', icon: Calendar, color: 'text-blue-400',
                  value: `${daysSinceJoin}d`,
                  sub: new Date(joinDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
                },
                {
                  label: 'Status', icon: Activity, color: membershipActive ? 'text-emerald-400' : 'text-rose-400',
                  value: membershipActive ? 'Active' : 'Expired',
                  sub: daysLeft !== null ? `${daysLeft}d left` : 'No plan',
                },
                {
                  label: 'Workouts', icon: Dumbbell, color: 'text-amber-400',
                  value: workouts.length,
                  sub: `${totalMinutes} mins total`,
                },
                {
                  label: 'Streak', icon: Flame, color: 'text-orange-400',
                  value: `${streak}d`,
                  sub: `${attendance.length} check-ins`,
                },
              ].map(({ label, icon: Icon, color, value, sub }) => (
                <Card key={label} className="print-card p-4">
                  <div className={`mb-1 ${color}`}><Icon className="w-4 h-4" /></div>
                  <p className="text-[11px] text-slate-500 mb-0.5">{label}</p>
                  <p className="text-xl font-bold text-white leading-tight">{value}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* ── SECTION B — Body Progress ───────────────────────────────── */}
          {(weightData.length > 0 || bmi) && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Body Progress</h2>
                {bmi && (
                  <span className="text-xs text-slate-500">
                    Current BMI: <span className="text-white font-semibold">{bmi}</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {weightData.length > 1 && (
                  <Card className="print-card p-4">
                    <p className="text-xs text-slate-400 mb-3 font-medium">Weight (kg)</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={weightData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
                        <Line type="monotone" dataKey="weight" stroke="#E11D1D" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {bmiData.length > 1 && (
                  <Card className="print-card p-4">
                    <p className="text-xs text-slate-400 mb-3 font-medium">BMI Trend</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={bmiData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
                        <Line type="monotone" dataKey="bmi" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* ── SECTION C — Workout Consistency ─────────────────────────── */}
          {weeklyData.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Workout Consistency</h2>
                <span className="text-xs text-slate-500">last 12 weeks</span>
              </div>

              <Card className="print-card p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" fill="#E11D1D" radius={[4, 4, 0, 0]} name="Workouts" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* ── SECTION D — Strength Progress ───────────────────────────── */}
          {strengthData.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Strength Progress</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {strengthData.map(({ name, data: pts }, i) => (
                  <Card key={name} className="print-card p-4">
                    <p className="text-xs text-slate-400 mb-3 font-medium">{name}</p>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={pts}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 9, fill: '#64748b' }} domain={['auto', 'auto']} unit=" kg" />
                        <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 11 }} />
                        <Line type="monotone" dataKey="weight" stroke={COLOURS[i % COLOURS.length]} strokeWidth={2} dot={false} name="Weight" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── SECTION E — Muscle Distribution ─────────────────────────── */}
          {muscleData.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Muscle Distribution</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pie chart */}
                <Card className="print-card p-4 flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={muscleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                        {muscleData.map((_, i) => (
                          <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>

                {/* Bar chart */}
                <Card className="print-card p-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={muscleData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Sets">
                        {muscleData.map((_, i) => <Cell key={i} fill={COLOURS[i % COLOURS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </div>
          )}

          {/* ── SECTION F — Workout Summary ──────────────────────────────── */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Workout Summary</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Stats */}
              <Card className="print-card p-4 space-y-3">
                {[
                  { label: 'Total Workouts', value: workouts.length },
                  { label: 'Total Duration', value: `${totalMinutes} min` },
                  { label: 'Total Attendance', value: `${attendance.length} days` },
                  { label: 'Most Trained Muscle', value: mostMuscle },
                  { label: 'Current Streak', value: `${streak} days` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-semibold text-white">{value}</span>
                  </div>
                ))}
              </Card>

              {/* Top exercises */}
              <Card className="print-card p-4">
                <p className="text-xs text-slate-400 font-medium mb-3">Most Frequent Exercises</p>
                {top5.length === 0 ? (
                  <p className="text-slate-600 text-sm">No workout entries yet</p>
                ) : (
                  <div className="space-y-2">
                    {top5.map(([name, count], i) => {
                      const pct = Math.round((count / top5[0][1]) * 100);
                      return (
                        <div key={name}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 truncate mr-2">{i + 1}. {name}</span>
                            <span className="text-slate-500 flex-shrink-0">{count}×</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-red-600" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* ── Empty state ───────────────────────────────────────────────── */}
          {workouts.length === 0 && attendance.length === 0 && weightLogs.length === 0 && (
            <Card className="p-10 text-center">
              <p className="text-slate-500">No workout or attendance data available for this member.</p>
            </Card>
          )}

        </div>
      </div>
    </>
  );
}
