'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dumbbell, Flame, TrendingUp, Weight, ChevronLeft, ChevronRight,
  Activity, Target, Award, Calendar, Zap, AlertCircle, CheckCircle,
  BarChart2, User,
} from 'lucide-react';
import { StatCard } from '@/components/ui/Card';
import { formatVolume, CATEGORY_COLORS } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';
import type { EnhancedAnalyticsData, WeightLog } from '@/types';
import { format, subWeeks, addWeeks, subMonths, addMonths, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

// ── Tooltip components ─────────────────────────────────────────────────────
const VolumeTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#0f0f0f] border border-white/10 rounded-xl px-3 py-2 text-sm">
        <p className="text-slate-400">{label}</p>
        <p className="text-white font-semibold">{payload[0].value.toLocaleString()} kg</p>
      </div>
    );
  }
  return null;
};

const CalTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#0f0f0f] border border-white/10 rounded-xl px-3 py-2 text-sm">
        <p className="text-slate-400">{label}</p>
        <p className="text-amber-400 font-semibold">{payload[0].value} kcal</p>
      </div>
    );
  }
  return null;
};

const WeightTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#0f0f0f] border border-white/10 rounded-xl px-3 py-2 text-sm">
        <p className="text-slate-400">{label}</p>
        <p className="text-emerald-400 font-semibold">{payload[0].value} kg</p>
      </div>
    );
  }
  return null;
};

// ── BMI gauge ring ─────────────────────────────────────────────────────────
function BMIGauge({ bmi, category }: { bmi: number; category: string }) {
  const pct = Math.min(Math.max((bmi - 10) / 30, 0), 1); // 10–40 range → 0–1
  const color = category === 'Normal' ? '#10b981' : category === 'Overweight' ? '#f59e0b' : category === 'Obese' ? '#ef4444' : '#6366f1';
  const r = 52, cx = 64, cy = 64;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ * 0.75; // 270° arc

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={128} height={100} className="-mb-2">
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10}
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
          strokeDashoffset={circ * 0.125}
          strokeLinecap="round" />
        {/* Fill */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ * 0.125}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        <text x={cx} y={cy + 6} textAnchor="middle" fill="white" fontSize={22} fontWeight="bold">{bmi}</text>
      </svg>
      <span className="text-sm font-semibold" style={{ color }}>{category}</span>
    </div>
  );
}

// ── Streak calendar ────────────────────────────────────────────────────────
function StreakCalendar({ attendanceDates, weekOffset }: { attendanceDates: string[]; weekOffset: number }) {
  const set = new Set(attendanceDates);
  const today = new Date();
  const base = weekOffset < 0 ? subWeeks(today, Math.abs(weekOffset)) : addWeeks(today, weekOffset);
  const wStart = startOfWeek(base, { weekStartsOn: 1 });
  const wEnd = endOfWeek(base, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: wStart, end: wEnd });

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {['M','T','W','T','F','S','S'].map((d, i) => (
        <div key={i} className="text-center text-[10px] text-slate-600 pb-0.5">{d}</div>
      ))}
      {days.map((day) => {
        const iso = format(day, 'yyyy-MM-dd');
        const isToday = iso === format(today, 'yyyy-MM-dd');
        const attended = set.has(iso);
        const isFuture = day > today;
        return (
          <div
            key={iso}
            title={iso}
            className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-medium transition-all
              ${isFuture ? 'opacity-20' : ''}
              ${attended ? 'bg-red-600/80 text-white' : isToday ? 'border border-red-600/50 text-red-400' : 'bg-white/5 text-slate-600'}`}
          >
            {format(day, 'd')}
          </div>
        );
      })}
    </div>
  );
}

// ── Month calendar (attendance dots) ──────────────────────────────────────
function MonthCalendar({ attendanceDates, monthOffset }: { attendanceDates: string[]; monthOffset: number }) {
  const set = new Set(attendanceDates);
  const today = new Date();
  const base = monthOffset < 0 ? subMonths(today, Math.abs(monthOffset)) : today;
  const mStart = new Date(base.getFullYear(), base.getMonth(), 1);
  const mEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const days = eachDayOfInterval({ start: mStart, end: mEnd });
  const startPad = (mStart.getDay() + 6) % 7; // Mon=0

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] text-slate-600">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map((day) => {
          const iso = format(day, 'yyyy-MM-dd');
          const isToday = iso === format(today, 'yyyy-MM-dd');
          const attended = set.has(iso);
          const isFuture = day > today;
          return (
            <div
              key={iso}
              className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium
                ${isFuture ? 'opacity-20' : ''}
                ${attended ? 'bg-red-600/80 text-white' : isToday ? 'border border-red-600/40 text-red-400' : 'bg-white/4 text-slate-700'}`}
            >
              {format(day, 'd')}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Body metrics setup card ────────────────────────────────────────────────
function BodySetupCard({ onSave }: { onSave: (h: number, w: number, g: string) => void }) {
  const [h, setH] = useState('');
  const [w, setW] = useState('');
  const [g, setG] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const GOALS = [
    { value: 'fat_loss', label: 'Fat Loss', icon: '🔥' },
    { value: 'muscle_gain', label: 'Muscle Gain', icon: '💪' },
    { value: 'maintenance', label: 'Maintenance', icon: '⚖️' },
  ];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!h || !w || !g) { setErr('All fields required'); return; }
    const hv = parseFloat(h), wv = parseFloat(w);
    if (isNaN(hv) || hv < 50 || hv > 300) { setErr('Invalid height'); return; }
    if (isNaN(wv) || wv < 20 || wv > 500) { setErr('Invalid weight'); return; }
    setSaving(true);
    await fetch('/api/body', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ height_cm: hv, weight_kg: wv, goal: g }),
    });
    setSaving(false);
    onSave(hv, wv, g);
  }

  return (
    <div className="glass-card p-5 border-amber-500/20">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-4 h-4 text-amber-400" />
        <h3 className="font-semibold text-white text-sm">Set up your body profile</h3>
        <span className="text-xs text-slate-500">— unlocks BMI, calories & recommendations</span>
      </div>
      <form onSubmit={save} className="space-y-3">
        {err && <p className="text-xs text-red-400">{err}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Height (cm)</label>
            <input value={h} onChange={e => setH(e.target.value)} type="number" placeholder="175"
              className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/40" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Weight (kg)</label>
            <input value={w} onChange={e => setW(e.target.value)} type="number" placeholder="70"
              className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/40" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">Goal</label>
          <div className="flex gap-2">
            {GOALS.map(go => (
              <button key={go.value} type="button" onClick={() => setG(go.value)}
                className={`flex-1 text-xs py-2 px-2 rounded-xl border transition-all ${g === go.value ? 'border-red-600/60 bg-red-700/10 text-white' : 'border-white/10 text-slate-500 hover:border-white/20'}`}>
                {go.icon} {go.label}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="w-full bg-red-700 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}

// ── Weight logger ──────────────────────────────────────────────────────────
function WeightLogger({ currentWeight, onLogged }: { currentWeight: number | null; onLogged: (w: number) => void }) {
  const [w, setW] = useState(currentWeight?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const wv = parseFloat(w);
    if (isNaN(wv) || wv < 20 || wv > 500) return;
    setSaving(true);
    await fetch('/api/weight-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight_kg: wv }),
    });
    setSaving(false);
    setDone(true);
    onLogged(wv);
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400">
        <CheckCircle className="w-4 h-4" /> Weight logged for today!
      </div>
    );
  }

  return (
    <form onSubmit={save} className="flex items-end gap-2">
      <div className="flex-1">
        <label className="block text-xs text-slate-500 mb-1">Log today&apos;s weight (kg)</label>
        <input value={w} onChange={e => setW(e.target.value)} type="number" step="0.1" placeholder="70.0"
          className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/40" />
      </div>
      <button type="submit" disabled={saving}
        className="bg-red-700 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50 whitespace-nowrap">
        {saving ? '…' : 'Log'}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'body' | 'calendar' | 'insights';

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<EnhancedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  // Navigation state
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch('/api/analytics');
    if (res.status === 401) { router.push('/login'); return; }
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function handleBodySave(h: number, w: number, g: string) {
    if (!data) return;
    const bmi = Math.round((w / Math.pow(h / 100, 2)) * 10) / 10;
    const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    setData((d) => d ? {
      ...d,
      bodyMetrics: { height_cm: h, weight_kg: w, goal: g as 'fat_loss' | 'muscle_gain' | 'maintenance' },
      bmi,
      bmiCategory: cat,
    } : d);
  }

  function handleWeightLogged(w: number) {
    if (!data) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    setData((d) => {
      if (!d) return d;
      const existing = d.weightLogs.find((l) => l.logged_at === today);
      const updated = existing
        ? d.weightLogs.map((l) => l.logged_at === today ? { ...l, weight_kg: w } : l)
        : [...d.weightLogs, { id: 'temp', user_id: '', weight_kg: w, note: null, logged_at: today, created_at: today }];
      return { ...d, weightLogs: updated, bodyMetrics: { ...d.bodyMetrics, weight_kg: w } };
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { key: 'body',     label: 'Body',     icon: <User className="w-3.5 h-3.5" /> },
    { key: 'calendar', label: 'Calendar', icon: <Calendar className="w-3.5 h-3.5" /> },
    { key: 'insights', label: 'Insights', icon: <Zap className="w-3.5 h-3.5" /> },
  ];

  const hasBody = !!(data?.bodyMetrics?.height_cm && data?.bodyMetrics?.weight_kg);

  // Week label for navigation
  const base = weekOffset < 0 ? subWeeks(new Date(), Math.abs(weekOffset)) : new Date();
  const wLabel = weekOffset === 0
    ? 'This Week'
    : `${format(startOfWeek(base, { weekStartsOn: 1 }), 'MMM d')} – ${format(endOfWeek(base, { weekStartsOn: 1 }), 'MMM d')}`;

  const mBase = monthOffset < 0 ? subMonths(new Date(), Math.abs(monthOffset)) : new Date();
  const mLabel = monthOffset === 0 ? format(new Date(), 'MMMM yyyy') : format(mBase, 'MMMM yyyy');

  // Earned badges
  const earnedBadges = data?.badges?.filter(b => b.earned) || [];
  const unearnedBadges = data?.badges?.filter(b => !b.earned) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-5xl text-white leading-none">ANALYTICS</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your complete training overview</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all ${
              tab === t.key ? 'bg-red-700 text-white shadow-lg shadow-red-900/30' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Workouts" value={data?.totalWorkouts ?? 0} icon={<Dumbbell className="w-5 h-5" />} color="red" />
            <StatCard label="Total Volume" value={formatVolume(data?.totalVolume ?? 0)} icon={<Weight className="w-5 h-5" />} color="violet" />
            <StatCard label="Current Streak" value={`${data?.currentStreak ?? 0}d`} icon={<Flame className="w-5 h-5" />} color="amber" />
            <StatCard label="Longest Streak" value={`${data?.longestStreak ?? 0}d`} icon={<TrendingUp className="w-5 h-5" />} color="emerald" />
          </div>

          {/* Calories row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Today', value: data?.calories?.today ?? 0, color: 'text-amber-400' },
              { label: 'This Week', value: data?.calories?.week ?? 0, color: 'text-orange-400' },
              { label: 'This Month', value: data?.calories?.month ?? 0, color: 'text-red-400' },
            ].map((c) => (
              <div key={c.label} className="glass-card p-4 text-center">
                <Flame className="w-4 h-4 text-amber-500 mx-auto mb-1.5" />
                <p className={`font-display text-2xl leading-none ${c.color}`}>{c.value.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{c.label}</p>
                <p className="text-[10px] text-slate-600">kcal</p>
              </div>
            ))}
          </div>

          {/* Weekly volume + calories chart with navigation */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white text-sm">Weekly Overview</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setWeekOffset(w => w - 1)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>
                <span className="text-xs text-slate-400 min-w-[90px] text-center">{wLabel}</span>
                <button onClick={() => setWeekOffset(w => Math.min(w + 1, 0))}
                  disabled={weekOffset === 0}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-30">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
            {(data?.weeklyWorkouts?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data!.weeklyWorkouts} barCategoryGap="30%">
                  <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={45} />
                  <Tooltip content={<VolumeTooltip />} cursor={{ fill: 'rgba(225,29,29,0.06)' }} />
                  <Bar dataKey="volume" fill="#dc2626" radius={[5,5,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-sm py-8 text-center">Log workouts to see volume data</p>
            )}
          </div>

          {/* Calories chart */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-white text-sm mb-4">Daily Calories Burned (kcal)</h2>
            {data?.calories?.dailyBreakdown?.some(d => d.calories > 0) ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data!.calories.dailyBreakdown} barCategoryGap="35%">
                  <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<CalTooltip />} cursor={{ fill: 'rgba(245,158,11,0.06)' }} />
                  <Bar dataKey="calories" fill="#f59e0b" radius={[5,5,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-sm py-6 text-center">Calories appear once workouts have a recorded duration</p>
            )}
          </div>

          {/* Monthly + Body part */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white text-sm">Monthly Workouts</h2>
                <div className="flex items-center gap-1">
                  <button onClick={() => setMonthOffset(m => m - 1)}
                    className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <span className="text-xs text-slate-400 min-w-[80px] text-center">{mLabel}</span>
                  <button onClick={() => setMonthOffset(m => Math.min(m + 1, 0))}
                    disabled={monthOffset === 0}
                    className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-30">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
              {(data?.monthlyWorkouts?.length ?? 0) > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data!.monthlyWorkouts} barCategoryGap="35%">
                    <XAxis dataKey="week" stroke="#475569" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={25} />
                    <Tooltip cursor={{ fill: 'rgba(225,29,29,0.06)' }} contentStyle={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[5,5,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-500 text-sm py-8 text-center">No data yet</p>
              )}
            </div>

            <div className="glass-card p-5">
              <h2 className="font-semibold text-white text-sm mb-4">Body Part Distribution</h2>
              {(data?.bodyPartDistribution?.length ?? 0) > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data!.bodyPartDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {data!.bodyPartDistribution.map((e) => (
                        <Cell key={e.name} fill={CATEGORY_COLORS[e.name] || '#dc2626'} />
                      ))}
                    </Pie>
                    <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                    <Tooltip contentStyle={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-500 text-sm py-8 text-center">Log workouts to see distribution</p>
              )}
            </div>
          </div>

          {/* Recent PRs */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-white text-sm mb-4">Recent PRs</h2>
            {(data?.recentPRs?.length ?? 0) > 0 ? (
              <div className="divide-y divide-white/5">
                {data!.recentPRs.map((pr) => (
                  <div key={pr.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-white">{(pr as { exercises?: { name: string } }).exercises?.name}</p>
                      <p className="text-xs text-slate-500">{new Date((pr as { achieved_at: string }).achieved_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-lg font-bold text-amber-400">{pr.max_weight} kg</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm py-6 text-center">No PRs yet — keep lifting!</p>
            )}
          </div>
        </div>
      )}

      {/* ── BODY TAB ──────────────────────────────────────────────────────── */}
      {tab === 'body' && (
        <div className="space-y-5">
          {!hasBody ? (
            <BodySetupCard onSave={handleBodySave} />
          ) : (
            <>
              {/* BMI card */}
              <div className="glass-card p-5">
                <h2 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-red-400" /> BMI Analysis
                </h2>
                <div className="flex items-center gap-6">
                  {data?.bmi && data?.bmiCategory && (
                    <BMIGauge bmi={data.bmi} category={data.bmiCategory} />
                  )}
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Height</p>
                      <p className="text-white font-semibold">{data?.bodyMetrics?.height_cm} cm</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Weight</p>
                      <p className="text-white font-semibold">{data?.bodyMetrics?.weight_kg} kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Goal</p>
                      <p className="text-white font-semibold capitalize">{data?.bodyMetrics?.goal?.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>
                {/* BMI scale */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex justify-between text-[10px] text-slate-600 mb-1">
                    <span>Underweight</span><span>Normal</span><span>Overweight</span><span>Obese</span>
                  </div>
                  <div className="h-2 rounded-full flex overflow-hidden">
                    <div className="w-1/4 bg-violet-500/70" />
                    <div className="w-1/4 bg-emerald-500/70" />
                    <div className="w-1/4 bg-amber-500/70" />
                    <div className="w-1/4 bg-red-500/70" />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                    <span>18.5</span><span>25</span><span>30</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Weight logger */}
          {hasBody && (
            <div className="glass-card p-5">
              <h2 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
                <Weight className="w-4 h-4 text-emerald-400" /> Weight Tracking
              </h2>
              <WeightLogger
                currentWeight={data?.bodyMetrics?.weight_kg ?? null}
                onLogged={handleWeightLogged}
              />

              {/* Weight trend graph */}
              {(data?.weightLogs?.length ?? 0) > 1 ? (
                <div className="mt-5">
                  <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Trend</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={data!.weightLogs.map((l: WeightLog) => ({
                      date: l.logged_at.slice(5), // MM-DD
                      weight: l.weight_kg,
                    }))}>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35} />
                      <Tooltip content={<WeightTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                      <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  {/* Delta */}
                  {data!.weightLogs.length >= 2 && (() => {
                    const logs = data!.weightLogs;
                    const delta = logs[logs.length - 1].weight_kg - logs[0].weight_kg;
                    return (
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <span className="text-slate-500">Overall change:</span>
                        <span className={delta > 0 ? 'text-amber-400' : delta < 0 ? 'text-emerald-400' : 'text-slate-400'}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(1)} kg
                        </span>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-xs text-slate-600 mt-4 text-center">Log weight weekly to see your trend graph</p>
              )}
            </div>
          )}

          {/* Update body metrics */}
          {hasBody && (
            <div className="glass-card p-5">
              <h2 className="font-semibold text-white text-sm mb-3">Update Profile</h2>
              <BodySetupCard onSave={handleBodySave} />
            </div>
          )}
        </div>
      )}

      {/* ── CALENDAR TAB ─────────────────────────────────────────────────── */}
      {tab === 'calendar' && (
        <div className="space-y-5">
          {/* Week view */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-400" /> Week View
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setWeekOffset(w => w - 1)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center">
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>
                <span className="text-xs text-slate-400 min-w-[80px] text-center">{wLabel}</span>
                <button onClick={() => setWeekOffset(w => Math.min(w + 1, 0))} disabled={weekOffset === 0}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center disabled:opacity-30">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
            <StreakCalendar attendanceDates={data?.attendanceDates || []} weekOffset={weekOffset} />
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-600/80" /> Attended</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-red-600/40" /> Today</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white/5" /> Missed</span>
            </div>
          </div>

          {/* Month view */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white text-sm">Month View</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setMonthOffset(m => m - 1)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center">
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>
                <span className="text-xs text-slate-400 min-w-[80px] text-center">{mLabel}</span>
                <button onClick={() => setMonthOffset(m => Math.min(m + 1, 0))} disabled={monthOffset === 0}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center disabled:opacity-30">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
            <MonthCalendar attendanceDates={data?.attendanceDates || []} monthOffset={monthOffset} />
          </div>

          {/* Streak summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4 text-center">
              <Flame className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <p className="font-display text-3xl text-white">{data?.currentStreak ?? 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">Current Streak</p>
            </div>
            <div className="glass-card p-4 text-center">
              <TrendingUp className="w-5 h-5 text-red-400 mx-auto mb-1" />
              <p className="font-display text-3xl text-white">{data?.longestStreak ?? 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">Longest Streak</p>
            </div>
          </div>
        </div>
      )}

      {/* ── INSIGHTS TAB ─────────────────────────────────────────────────── */}
      {tab === 'insights' && (
        <div className="space-y-5">
          {/* Badges */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" /> Badges
            </h2>

            {earnedBadges.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {earnedBadges.map((b) => (
                  <div key={b.type} className="flex flex-col items-center gap-1.5 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl text-center">
                    <span className="text-2xl">{b.icon}</span>
                    <p className="text-xs font-semibold text-white">{b.label}</p>
                    <p className="text-[10px] text-slate-500 leading-tight">{b.description}</p>
                  </div>
                ))}
              </div>
            )}

            {unearnedBadges.length > 0 && (
              <>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">Locked</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {unearnedBadges.map((b) => (
                    <div key={b.type} className="flex items-center gap-2 p-2.5 bg-white/3 border border-white/5 rounded-xl opacity-50">
                      <span className="text-lg grayscale">{b.icon}</span>
                      <div>
                        <p className="text-[11px] font-medium text-slate-400">{b.label}</p>
                        <p className="text-[10px] text-slate-600 leading-tight">{b.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {data?.badges?.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">Start logging workouts to earn badges!</p>
            )}
          </div>

          {/* Workout recommendation */}
          {data?.recommendation ? (
            <div className="glass-card p-5 border-red-600/20">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-red-400" /> Smart Recommendation
                </h2>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  data.recommendation.bmiCategory === 'Normal' ? 'bg-emerald-500/10 text-emerald-400' :
                  data.recommendation.bmiCategory === 'Overweight' ? 'bg-amber-500/10 text-amber-400' :
                  data.recommendation.bmiCategory === 'Obese' ? 'bg-red-500/10 text-red-400' :
                  'bg-violet-500/10 text-violet-400'
                }`}>
                  {data.recommendation.bmiCategory}
                </span>
              </div>

              <div className="mb-3">
                <p className="font-display text-xl text-red-400 leading-none mb-1">{data.recommendation.split}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{data.recommendation.description}</p>
              </div>

              <div className="space-y-1.5 mb-4">
                {data.recommendation.emphasis.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <div className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
                    {e}
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/15 rounded-xl p-3 text-xs text-amber-400/80">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                {data.recommendation.note}
              </div>
            </div>
          ) : (
            <div className="glass-card p-5 text-center">
              <Target className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Set your body profile to unlock smart workout recommendations.</p>
              <button onClick={() => setTab('body')}
                className="mt-3 text-red-400 text-sm hover:text-red-300 transition-colors">
                Set up body profile →
              </button>
            </div>
          )}

          {/* Weekly goals */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Weekly Goals
            </h2>
            {(() => {
              const target = 4;
              const done = data?.weeklyWorkouts?.filter(w => w.volume > 0).length ?? 0;
              const pct = Math.min((done / target) * 100, 100);
              return (
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-400">Complete {target} workouts this week</span>
                    <span className={`font-semibold ${done >= target ? 'text-emerald-400' : 'text-white'}`}>{done}/{target}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }} />
                  </div>
                  {done >= target && (
                    <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Goal achieved this week! 🎉
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Calorie goal */}
            {hasBody && (() => {
              const calGoal = data?.bodyMetrics?.goal === 'fat_loss' ? 2000 : data?.bodyMetrics?.goal === 'muscle_gain' ? 1500 : 1800;
              const burned = data?.calories?.week ?? 0;
              const pct = Math.min((burned / calGoal) * 100, 100);
              return (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-400">Burn {calGoal.toLocaleString()} kcal this week</span>
                    <span className={`font-semibold ${burned >= calGoal ? 'text-emerald-400' : 'text-amber-400'}`}>{burned}/{calGoal}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
