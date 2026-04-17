'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, User, Calendar, Activity, Flame, Scale,
  Dumbbell, TrendingUp, BarChart2, Download, RefreshCw, ClipboardList,
  Plus, Trash2, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { isMembershipActive, daysRemaining } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberData {
  user: {
    id: string; name: string | null; phone_number: string;
    created_at: string; height_cm: number | null; weight_kg: number | null;
    goal: string | null; assigned_plan: string | null; plan_source: string | null;
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

type Period = 'all' | '3mo' | '1mo';

const PLAN_OPTIONS = [
  { value: '', label: '— System decides —' },
  { value: 'push_pull_legs', label: 'Push / Pull / Legs' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'upper_lower', label: 'Upper / Lower' },
];

// ─── Custom plan types ────────────────────────────────────────────────────────

interface PlanSet { weight: string; reps: string; }

interface PlanExercise {
  _id: string; // local key only
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  equipment: string;
  sets: PlanSet[];
}

interface PlanDay {
  _id: string; // local key only
  label: string;
  exercises: PlanExercise[];
  collapsed: boolean;
}

interface ExerciseOption { id: string; name: string; category: string; muscle_group: string | null; equipment: string | null; }

let _lid = 0;
function lid() { return String(++_lid); }

function makePlanExercise(): PlanExercise {
  return { _id: lid(), exercise_id: '', exercise_name: '', muscle_group: '', equipment: '', sets: [{ weight: '', reps: '10' }] };
}
function makePlanDay(index: number): PlanDay {
  return { _id: lid(), label: `Day ${index + 1}`, exercises: [makePlanExercise()], collapsed: false };
}

// Convert PlanDay[] → API-safe format (strip _id / collapsed)
function serializePlan(days: PlanDay[]) {
  return days.map((d) => ({
    day: d.label,
    exercises: d.exercises.map((e) => ({
      exercise_id: e.exercise_id,
      exercise_name: e.exercise_name,
      muscle_group: e.muscle_group,
      equipment: e.equipment,
      sets: e.sets.map((s) => ({ weight: parseFloat(s.weight) || 0, reps: parseInt(s.reps) || 0 })),
    })),
  }));
}

// Re-hydrate API custom_plan JSON → PlanDay[]
function deserializePlan(raw: unknown): PlanDay[] {
  if (!Array.isArray(raw)) return [makePlanDay(0)];
  return (raw as { day: string; exercises: { exercise_id: string; exercise_name: string; muscle_group: string; equipment: string; sets: { weight: number; reps: number }[] }[] }[]).map((d) => ({
    _id: lid(),
    label: d.day || 'Day',
    collapsed: false,
    exercises: (d.exercises || []).map((e) => ({
      _id: lid(),
      exercise_id: e.exercise_id || '',
      exercise_name: e.exercise_name || '',
      muscle_group: e.muscle_group || '',
      equipment: e.equipment || '',
      sets: (e.sets || []).map((s) => ({ weight: String(s.weight ?? ''), reps: String(s.reps ?? '10') })),
    })),
  }));
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

function cutoffDate(period: Period): string | null {
  if (period === 'all') return null;
  const d = new Date();
  d.setMonth(d.getMonth() - (period === '3mo' ? 3 : 1));
  return d.toISOString().split('T')[0];
}

function filterByPeriod<T extends { date: string }>(items: T[], period: Period): T[] {
  const cutoff = cutoffDate(period);
  if (!cutoff) return items;
  return items.filter((i) => i.date >= cutoff);
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
  // Map: exercise name → { isoDate, formattedDate, weight }[]
  const map: Record<string, { iso: string; date: string; weight: number }[]> = {};
  for (const w of workouts) {
    for (const e of w.workout_entries) {
      if (!e.exercises || !e.weight) continue;
      const name = e.exercises.name;
      if (!map[name]) map[name] = [];
      map[name].push({ iso: w.date, date: fmtShort(w.date), weight: e.weight });
    }
  }
  return Object.entries(map)
    .filter(([, pts]) => pts.length >= 2)
    .slice(0, 6)
    .map(([name, data]) => ({
      name,
      // Sort by raw ISO date, then slice, then format for display
      data: data.sort((a, b) => a.iso.localeCompare(b.iso)).slice(-12),
    }));
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
  const [period, setPeriod] = useState<Period>('all');

  // Plan override state
  const [selectedPlan, setSelectedPlan] = useState('');
  const [planSaving, setPlanSaving] = useState(false);
  const [planMsg, setPlanMsg] = useState('');

  // Custom plan builder state
  const [planMode, setPlanMode] = useState<'preset' | 'custom'>('preset');
  const [customDays, setCustomDays] = useState<PlanDay[]>([makePlanDay(0)]);
  const [planExercises, setPlanExercises] = useState<ExerciseOption[]>([]);
  const [groupedPlanEx, setGroupedPlanEx] = useState<Record<string, ExerciseOption[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/members/${userId}`);
    if (res.status === 403) { router.push('/admin/login'); return; }
    if (!res.ok) { setError('Failed to load member data'); setLoading(false); return; }
    const json: MemberData = await res.json();
    setData(json);

    // Initialize plan UI from saved data
    const ap = json.user.assigned_plan ?? '';
    const cp = (json.user as unknown as Record<string, unknown>).custom_plan;
    if (ap === 'custom' && cp) {
      setPlanMode('custom');
      setCustomDays(deserializePlan(cp));
    } else {
      setPlanMode('preset');
      setSelectedPlan(ap);
    }
    setLoading(false);
  }, [userId, router]);

  useEffect(() => { load(); }, [load]);

  // Load exercises for custom plan builder
  useEffect(() => {
    fetch('/api/exercises')
      .then((r) => r.json())
      .then((d) => {
        const list: ExerciseOption[] = d.exercises || [];
        setPlanExercises(list);
        const grouped: Record<string, ExerciseOption[]> = {};
        for (const ex of list) {
          if (!grouped[ex.category]) grouped[ex.category] = [];
          grouped[ex.category].push(ex);
        }
        setGroupedPlanEx(grouped);
      })
      .catch(() => {});
  }, []);

  const savePlan = async () => {
    setPlanSaving(true);
    setPlanMsg('');

    let body: Record<string, unknown>;

    if (planMode === 'custom') {
      // Validate: every exercise must have an exercise_id
      const hasEmpty = customDays.some((d) => d.exercises.some((e) => !e.exercise_id));
      if (hasEmpty) { setPlanMsg('Select an exercise for every row.'); setPlanSaving(false); return; }
      body = { assigned_plan: 'custom', custom_plan: serializePlan(customDays) };
    } else {
      body = { assigned_plan: selectedPlan || null };
    }

    const res = await fetch(`/api/admin/members/${userId}/plan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setPlanSaving(false);
    if (res.ok) {
      setPlanMsg('Plan saved!');
      setTimeout(() => setPlanMsg(''), 3000);
    } else {
      setPlanMsg('Failed to save. Try again.');
    }
  };

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

  // ── Apply period filter ──────────────────────────────────────────────────
  const filteredWorkouts = filterByPeriod(workouts, period);
  const filteredAttendance = filterByPeriod(attendance, period);

  // ── Derived data ────────────────────────────────────────────────────────
  const membershipActive = membership ? isMembershipActive(membership.end_date) : false;
  const joinDate = membership?.joined_on || membership?.start_date || user.created_at;
  const daysSinceJoin = Math.floor((Date.now() - new Date(joinDate).getTime()) / 86_400_000);
  const membershipDuration = daysSinceJoin < 30
    ? `${daysSinceJoin}d`
    : daysSinceJoin < 365
    ? `${Math.round(daysSinceJoin / 30)}mo`
    : `${(daysSinceJoin / 365).toFixed(1)}yr`;

  const streak = calcStreak(attendance.map((a) => a.date));
  const totalMinutes = filteredWorkouts.reduce((s, w) => s + Math.round((w.duration_seconds || 0) / 60), 0);

  const weeklyData = workoutsPerWeek(filteredWorkouts);
  const strengthData = strengthProgress(filteredWorkouts);
  const muscleData = muscleDistribution(filteredWorkouts);
  const top5 = topExercises(filteredWorkouts);
  const mostMuscle = muscleData[0]?.name || '—';

  // Recent trend: compare last 4 weeks vs previous 4 weeks
  const recentWorkoutsCount = workouts.filter((w) => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 28);
    return new Date(w.date) >= cutoff;
  }).length;
  const prevWorkoutsCount = workouts.filter((w) => {
    const start = new Date(); start.setDate(start.getDate() - 56);
    const end = new Date(); end.setDate(end.getDate() - 28);
    return new Date(w.date) >= start && new Date(w.date) < end;
  }).length;
  const trendDiff = recentWorkoutsCount - prevWorkoutsCount;
  const trendLabel = trendDiff > 0 ? `+${trendDiff} vs prev 4wk` : trendDiff < 0 ? `${trendDiff} vs prev 4wk` : 'Same as prev 4wk';
  const trendColor = trendDiff > 0 ? 'text-emerald-400' : trendDiff < 0 ? 'text-rose-400' : 'text-slate-400';

  const weightData = weightLogs.map((w) => ({ date: fmt(w.logged_at), weight: w.weight_kg }));

  const bmi = user.height_cm && user.weight_kg
    ? Math.round((user.weight_kg / Math.pow(user.height_cm / 100, 2)) * 10) / 10
    : null;

  const bmiData = weightLogs.map((w) => ({
    date: fmt(w.logged_at),
    bmi: user.height_cm
      ? Math.round((w.weight_kg / Math.pow(user.height_cm / 100, 2)) * 10) / 10
      : null,
  })).filter((d) => d.bmi !== null);

  const daysLeft = membership ? daysRemaining(membership.end_date) : null;

  const PERIOD_LABELS: Record<Period, string> = { all: 'All Time', '3mo': '3 Months', '1mo': '1 Month' };

  const tooltipStyle = { background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 12 };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-card { border: 1px solid #ddd !important; background: white !important; break-inside: avoid; }
          h2, h3, p, span { color: black !important; }
        }
      `}</style>

      <div className="admin-shell min-h-screen bg-[#000000] p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/admin/dashboard"
                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors shrink-0">
                <ArrowLeft className="w-4 h-4" /> Dashboard
              </Link>
              <span className="text-slate-700">/</span>
              <span className="text-slate-300 text-sm font-medium truncate">{user.name || user.phone_number}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={load} className="p-2 text-slate-400 hover:text-white transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-700 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-all">
                <Download className="w-3.5 h-3.5" /> Report
              </button>
            </div>
          </div>

          {/* ── Period filter ───────────────────────────────────────────── */}
          <div className="flex items-center gap-2 no-print">
            <span className="text-xs text-slate-500">Period:</span>
            {(['all', '3mo', '1mo'] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  period === p
                    ? 'bg-red-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {/* ── SECTION A — Overview ─────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-red-400" />
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Overview</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                {
                  label: 'Member', icon: User, color: 'text-slate-300',
                  value: user.name || '—', sub: user.phone_number,
                },
                {
                  label: 'Tenure', icon: Calendar, color: 'text-blue-400',
                  value: membershipDuration,
                  sub: new Date(joinDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
                },
                {
                  label: 'Status', icon: Activity, color: membershipActive ? 'text-emerald-400' : 'text-rose-400',
                  value: membershipActive ? 'Active' : 'Expired',
                  sub: daysLeft !== null ? `${daysLeft}d left` : 'No plan',
                },
                {
                  label: 'Workouts', icon: Dumbbell, color: 'text-amber-400',
                  value: filteredWorkouts.length,
                  sub: `${totalMinutes} min`,
                },
                {
                  label: 'Streak', icon: Flame, color: 'text-orange-400',
                  value: `${streak}d`,
                  sub: `${filteredAttendance.length} check-ins`,
                },
                {
                  label: 'Trend', icon: TrendingUp, color: trendColor,
                  value: recentWorkoutsCount,
                  sub: trendLabel,
                },
              ].map(({ label, icon: Icon, color, value, sub }) => (
                <Card key={label} className="print-card p-3 md:p-4">
                  <div className={`mb-1 ${color}`}><Icon className="w-4 h-4" /></div>
                  <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
                  <p className="text-lg md:text-xl font-bold text-white leading-tight">{value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 break-words">{sub}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* ── SECTION B — Workout Plan Builder ────────────────────────── */}
          <section className="no-print">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-4 h-4 text-red-400" />
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Workout Plan Override</h2>
              <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                user.plan_source === 'admin' ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-700 text-slate-400'
              }`}>
                {user.plan_source === 'admin' ? 'Admin override active' : 'System auto'}
              </span>
            </div>

            <Card className="p-4 space-y-4">
              {/* Mode toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPlanMode('preset')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${planMode === 'preset' ? 'bg-red-700 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                  Preset Plan
                </button>
                <button
                  onClick={() => setPlanMode('custom')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${planMode === 'custom' ? 'bg-red-700 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                  Custom Builder
                </button>
              </div>

              {/* ── Preset mode ── */}
              {planMode === 'preset' && (
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1.5">Assign a preset plan</label>
                    <select
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="w-full sm:max-w-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    >
                      {PLAN_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-[#111]">{o.label}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-600 mt-1">The member will see this plan as a quick-start option in their workout page.</p>
                  </div>
                </div>
              )}

              {/* ── Custom builder mode ── */}
              {planMode === 'custom' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">Build a day-by-day workout plan. Each day can have different exercises with specific sets, reps, and weights.</p>

                  {customDays.map((day, dayIdx) => (
                    <div key={day._id} className="border border-white/10 rounded-xl overflow-hidden">
                      {/* Day header */}
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-white/5">
                        <button
                          onClick={() => setCustomDays((prev) => prev.map((d) => d._id === day._id ? { ...d, collapsed: !d.collapsed } : d))}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          {day.collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                        <input
                          value={day.label}
                          onChange={(e) => setCustomDays((prev) => prev.map((d) => d._id === day._id ? { ...d, label: e.target.value } : d))}
                          className="flex-1 bg-transparent border-none text-sm font-semibold text-white focus:outline-none placeholder:text-slate-600"
                          placeholder={`Day ${dayIdx + 1}`}
                        />
                        <span className="text-[10px] text-slate-600 shrink-0">{day.exercises.length} exercise{day.exercises.length !== 1 ? 's' : ''}</span>
                        {customDays.length > 1 && (
                          <button
                            onClick={() => setCustomDays((prev) => prev.filter((d) => d._id !== day._id))}
                            className="p-1 text-slate-600 hover:text-rose-400 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Day body */}
                      {!day.collapsed && (
                        <div className="p-3 space-y-3">
                          {day.exercises.map((ex, exIdx) => (
                            <div key={ex._id} className="bg-white/3 border border-white/8 rounded-lg p-3 space-y-2">
                              {/* Exercise row */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-600 w-5 shrink-0">{exIdx + 1}.</span>
                                <select
                                  value={ex.exercise_id}
                                  onChange={(e) => {
                                    const found = planExercises.find((p) => p.id === e.target.value);
                                    setCustomDays((prev) => prev.map((d) => d._id !== day._id ? d : {
                                      ...d,
                                      exercises: d.exercises.map((x) => x._id !== ex._id ? x : {
                                        ...x,
                                        exercise_id: e.target.value,
                                        exercise_name: found?.name || '',
                                        muscle_group: found?.muscle_group || '',
                                        equipment: found?.equipment || '',
                                      }),
                                    }));
                                  }}
                                  className="flex-1 bg-[#0f0f0f] border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-600 min-h-[40px]"
                                >
                                  <option value="">Select exercise…</option>
                                  {Object.entries(groupedPlanEx).map(([cat, exs]) => (
                                    <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                                      {exs.map((e) => (
                                        <option key={e.id} value={e.id}>{e.name}</option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>
                                {day.exercises.length > 1 && (
                                  <button
                                    onClick={() => setCustomDays((prev) => prev.map((d) => d._id !== day._id ? d : {
                                      ...d, exercises: d.exercises.filter((x) => x._id !== ex._id),
                                    }))}
                                    className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {ex.muscle_group && (
                                <p className="text-[10px] text-slate-600 pl-7">{ex.muscle_group}{ex.equipment ? ` · ${ex.equipment}` : ''}</p>
                              )}

                              {/* Sets */}
                              <div className="pl-7 space-y-1.5">
                                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-1">
                                  <span className="text-[10px] text-slate-600 font-semibold">Weight (kg)</span>
                                  <span className="text-[10px] text-slate-600 font-semibold">Reps</span>
                                  <span />
                                </div>
                                {ex.sets.map((set, setIdx) => (
                                  <div key={setIdx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                                    <input
                                      type="number"
                                      value={set.weight}
                                      min={0}
                                      placeholder="e.g. 60"
                                      onChange={(e) => setCustomDays((prev) => prev.map((d) => d._id !== day._id ? d : {
                                        ...d, exercises: d.exercises.map((x) => x._id !== ex._id ? x : {
                                          ...x, sets: x.sets.map((s, i) => i === setIdx ? { ...s, weight: e.target.value } : s),
                                        }),
                                      }))}
                                      className="bg-[#0f0f0f] border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-600 w-full"
                                    />
                                    <input
                                      type="number"
                                      value={set.reps}
                                      min={1}
                                      placeholder="e.g. 10"
                                      onChange={(e) => setCustomDays((prev) => prev.map((d) => d._id !== day._id ? d : {
                                        ...d, exercises: d.exercises.map((x) => x._id !== ex._id ? x : {
                                          ...x, sets: x.sets.map((s, i) => i === setIdx ? { ...s, reps: e.target.value } : s),
                                        }),
                                      }))}
                                      className="bg-[#0f0f0f] border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-600 w-full"
                                    />
                                    <button
                                      disabled={ex.sets.length <= 1}
                                      onClick={() => setCustomDays((prev) => prev.map((d) => d._id !== day._id ? d : {
                                        ...d, exercises: d.exercises.map((x) => x._id !== ex._id ? x : {
                                          ...x, sets: x.sets.filter((_, i) => i !== setIdx),
                                        }),
                                      }))}
                                      className="p-1 text-slate-600 hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  onClick={() => setCustomDays((prev) => prev.map((d) => d._id !== day._id ? d : {
                                    ...d, exercises: d.exercises.map((x) => x._id !== ex._id ? x : {
                                      ...x, sets: [...x.sets, { weight: x.sets[x.sets.length - 1]?.weight || '', reps: x.sets[x.sets.length - 1]?.reps || '10' }],
                                    }),
                                  }))}
                                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-emerald-400 transition-colors mt-1"
                                >
                                  <Plus className="w-3 h-3" /> Add set
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Add exercise to this day */}
                          <button
                            onClick={() => setCustomDays((prev) => prev.map((d) => d._id === day._id ? { ...d, exercises: [...d.exercises, makePlanExercise()] } : d))}
                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white border border-dashed border-white/10 hover:border-white/20 rounded-lg px-3 py-2 w-full transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add exercise to {day.label}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add day */}
                  <button
                    onClick={() => setCustomDays((prev) => [...prev, makePlanDay(prev.length)])}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white border border-dashed border-white/10 hover:border-white/20 rounded-lg px-4 py-3 w-full transition-all justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add workout day
                  </button>
                </div>
              )}

              {/* Save bar */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  {planMsg && (
                    <span className={`text-xs ${planMsg.includes('saved') ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {planMsg}
                    </span>
                  )}
                  {user.plan_source === 'admin' && (
                    <button
                      onClick={async () => {
                        setPlanSaving(true);
                        await fetch(`/api/admin/members/${userId}/plan`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ assigned_plan: null }),
                        });
                        setPlanSaving(false);
                        setPlanMode('preset');
                        setSelectedPlan('');
                        setPlanMsg('Reset to system.');
                        setTimeout(() => setPlanMsg(''), 3000);
                      }}
                      className="text-[10px] text-slate-600 hover:text-rose-400 transition-colors"
                    >
                      Reset to system
                    </button>
                  )}
                </div>
                <button
                  onClick={savePlan}
                  disabled={planSaving}
                  className="px-5 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all"
                >
                  {planSaving ? 'Saving…' : 'Save Plan'}
                </button>
              </div>
            </Card>
          </section>

          {/* ── SECTION C — Body Progress ───────────────────────────────── */}
          {(weightData.length > 0 || bmi) && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Scale className="w-4 h-4 text-red-400" />
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Body Progress</h2>
                {bmi && (
                  <span className="text-xs text-slate-500">
                    BMI: <span className="text-white font-semibold">{bmi}</span>
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
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: '#64748b' }} domain={['auto', 'auto']} width={36} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#333' }} />
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
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: '#64748b' }} domain={['auto', 'auto']} width={36} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#333' }} />
                        <Line type="monotone" dataKey="bmi" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>
            </section>
          )}

          {/* ── SECTION D — Consistency + Strength (side-by-side) ───────── */}
          {(weeklyData.length > 0 || strengthData.length > 0) && (
            <section>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Workout Consistency */}
                {weeklyData.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart2 className="w-4 h-4 text-red-400" />
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Consistency</h2>
                      <span className="text-[10px] text-slate-600">last 12 wk</span>
                    </div>
                    <Card className="print-card p-4">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={weeklyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                          <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#64748b' }} interval="preserveStartEnd" />
                          <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(225,29,29,0.08)' }} />
                          <Bar dataKey="count" fill="#E11D1D" radius={[4, 4, 0, 0]} name="Workouts" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>
                )}

                {/* Strength Progress — first exercise */}
                {strengthData.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-red-400" />
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Strength</h2>
                      <span className="text-[10px] text-slate-600 truncate">{strengthData[0].name}</span>
                    </div>
                    <Card className="print-card p-4">
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={strengthData[0].data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} />
                          <YAxis tick={{ fontSize: 9, fill: '#64748b' }} domain={['auto', 'auto']} unit=" kg" />
                          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#333' }} />
                          <Line type="monotone" dataKey="weight" stroke={COLOURS[0]} strokeWidth={2} dot={false} name="Weight" />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>
                )}
              </div>

              {/* Remaining strength exercises */}
              {strengthData.length > 1 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-red-400" />
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">More Strength Trends</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {strengthData.slice(1).map(({ name, data: pts }, i) => (
                      <Card key={name} className="print-card p-4">
                        <p className="text-xs text-slate-400 mb-3 font-medium">{name}</p>
                        <ResponsiveContainer width="100%" height={140}>
                          <LineChart data={pts}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} />
                            <YAxis tick={{ fontSize: 9, fill: '#64748b' }} domain={['auto', 'auto']} unit=" kg" />
                            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#333' }} />
                            <Line type="monotone" dataKey="weight" stroke={COLOURS[(i + 1) % COLOURS.length]} strokeWidth={2} dot={false} name="Weight" />
                          </LineChart>
                        </ResponsiveContainer>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── SECTION E — Muscle Distribution ─────────────────────────── */}
          {muscleData.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-red-400" />
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Muscle Distribution</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="print-card p-4 flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={muscleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                        {muscleData.map((_, i) => (
                          <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
                <Card className="print-card p-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={muscleData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(225,29,29,0.08)' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Sets">
                        {muscleData.map((_, i) => <Cell key={i} fill={COLOURS[i % COLOURS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </section>
          )}

          {/* ── SECTION F — Workout Summary ──────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell className="w-4 h-4 text-red-400" />
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Summary</h2>
              {period !== 'all' && <span className="text-[10px] text-slate-600">({PERIOD_LABELS[period]})</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="print-card p-4 space-y-3">
                {[
                  { label: 'Total Workouts', value: filteredWorkouts.length },
                  { label: 'Total Duration', value: `${totalMinutes} min` },
                  { label: 'Total Attendance', value: `${filteredAttendance.length} days` },
                  { label: 'Member Tenure', value: membershipDuration },
                  { label: 'Most Trained Muscle', value: mostMuscle },
                  { label: 'Current Streak', value: `${streak} days` },
                  { label: 'Last 4 wk workouts', value: `${recentWorkoutsCount} (${trendLabel})` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-slate-500 shrink-0">{label}</span>
                    <span className="font-semibold text-white text-right">{value}</span>
                  </div>
                ))}
              </Card>

              <Card className="print-card p-4">
                <p className="text-xs text-slate-400 font-medium mb-3">Most Frequent Exercises</p>
                {top5.length === 0 ? (
                  <p className="text-slate-600 text-sm">No workout entries yet</p>
                ) : (
                  <div className="space-y-2.5">
                    {top5.map(([name, count], i) => {
                      const pct = Math.round((count / top5[0][1]) * 100);
                      return (
                        <div key={name}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300">{i + 1}. {name}</span>
                            <span className="text-slate-500 ml-2 shrink-0">{count}×</span>
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
          </section>

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
