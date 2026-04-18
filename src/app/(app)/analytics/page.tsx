'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dumbbell, Flame, TrendingUp, Weight, ChevronLeft, ChevronRight,
  Activity, Target, Award, Calendar, Zap, AlertCircle, CheckCircle,
  BarChart2, User, X,
} from 'lucide-react';
import { StatCard } from '@/components/ui/Card';
import { formatVolume, CATEGORY_COLORS } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';
import type { EnhancedAnalyticsData, WeightLog, RawWorkout } from '@/types';
import {
  format, addDays, subWeeks, addWeeks, startOfWeek,
  subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, endOfWeek,
} from 'date-fns';

// ── Tooltip components ─────────────────────────────────────────────────────
const VolumeTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-violet-500/20 bg-[#0a0a0a] px-3 py-2 text-sm shadow-xl shadow-violet-900/20">
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
      <div className="rounded-xl border border-violet-500/20 bg-[#0a0a0a] px-3 py-2 text-sm shadow-xl shadow-violet-900/20">
        <p className="text-slate-400">{label}</p>
        <p className="font-semibold text-violet-400">{payload[0].value} kcal</p>
      </div>
    );
  }
  return null;
};

const WeightTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-violet-500/20 bg-[#0a0a0a] px-3 py-2 text-sm shadow-xl shadow-violet-900/20">
        <p className="text-slate-400">{label}</p>
        <p className="font-semibold text-violet-400">{payload[0].value} kg</p>
      </div>
    );
  }
  return null;
};

const MonthTooltip = ({ active, payload, label }: { active?: boolean; payload?: { payload?: { label?: string }; value: number }[]; label?: string }) => {
  if (active && payload?.length) {
    const rangeLabel = payload[0]?.payload?.label;
    return (
      <div className="rounded-xl border border-violet-500/20 bg-[#0a0a0a] px-3 py-2 text-sm shadow-xl shadow-violet-900/20">
        <p className="text-slate-400">{label} {rangeLabel ? `(${rangeLabel})` : ''}</p>
        <p className="text-white font-semibold">{payload[0].value} workout{payload[0].value !== 1 ? 's' : ''}</p>
      </div>
    );
  }
  return null;
};

// ── Client-side chart computation helpers ──────────────────────────────────

/** Mirror of server MET logic */
function getMET(type: string, secs: number): number {
  const h = secs / 3600;
  if (type === 'legs') return h > 1 ? 6 : 5;
  if (type === 'push' || type === 'pull') return h > 1 ? 5.5 : 5;
  return h > 1.5 ? 5 : 4;
}

/** Calories for one workout (estimates duration if timer wasn't used) */
function workoutCalories(w: RawWorkout, weightKg: number): number {
  const dur = w.duration_seconds > 0
    ? w.duration_seconds
    : Math.max(w.workout_entries.reduce((n, e) => n + (e.sets || 1), 0) * 240, 1800);
  return Math.round(getMET(w.workout_type, dur) * weightKg * (dur / 3600));
}

/**
 * Returns 7 ISO date strings for the week containing `weekOffset`.
 * weekOffset=0 → current week, -1 → last week, etc.
 * Week starts on SUNDAY (weekStartsOn: 0).
 */
function getWeekDates(weekOffset: number): string[] {
  const today = new Date();
  const base = weekOffset < 0 ? subWeeks(today, -weekOffset) : today;
  const wStart = startOfWeek(base, { weekStartsOn: 0 }); // Sunday
  return Array.from({ length: 7 }, (_, i) => format(addDays(wStart, i), 'yyyy-MM-dd'));
}

/** Weekly chart data: Sun → Sat for the selected weekOffset */
function computeWeekly(
  rawWorkouts: RawWorkout[],
  weekOffset: number,
  weightKg: number,
): { date: string; fullDate: string; volume: number; calories: number }[] {
  return getWeekDates(weekOffset).map((iso) => {
    const dayWs = rawWorkouts.filter((w) => w.date === iso);
    let vol = 0, cal = 0;
    for (const w of dayWs) {
      for (const e of w.workout_entries) vol += e.weight * e.reps * e.sets;
      cal += workoutCalories(w, weightKg);
    }
    return {
      date: format(new Date(iso + 'T12:00:00'), 'EEE'), // Sun, Mon, Tue, Wed, Thu, Fri, Sat
      fullDate: iso,
      volume: Math.round(vol),
      calories: cal,
    };
  });
}

/**
 * Monthly chart: groups workouts into fixed weekly bins within the month.
 * W1=days 1-7, W2=8-14, W3=15-21, W4=22-28, W5=29+ (only if month has those days).
 * Never produces invalid weeks like "W6".
 */
function computeMonthly(
  rawWorkouts: RawWorkout[],
  monthOffset: number,
): { week: string; label: string; count: number; startDate: string; endDate: string }[] {
  const today = new Date();
  const base = monthOffset < 0 ? subMonths(today, -monthOffset) : today;
  const mStart = startOfMonth(base);
  const daysInMonth = endOfMonth(base).getDate();
  const yr = mStart.getFullYear(), mo = mStart.getMonth();

  const buckets: { week: string; label: string; count: number; startDate: string; endDate: string }[] = [];
  let wn = 1;
  for (let s = 1; s <= daysInMonth; s += 7) {
    const e = Math.min(s + 6, daysInMonth);
    const sd = format(new Date(yr, mo, s), 'yyyy-MM-dd');
    const ed = format(new Date(yr, mo, e), 'yyyy-MM-dd');
    const count = rawWorkouts.filter((w) => w.date >= sd && w.date <= ed).length;
    buckets.push({ week: `W${wn}`, label: `${s}–${e}`, count, startDate: sd, endDate: ed });
    wn++;
  }
  return buckets;
}

/**
 * Body part distribution — filtered to `filterDates` if provided,
 * otherwise aggregates all workouts.
 */
function computeBodyDist(
  rawWorkouts: RawWorkout[],
  filterDates: string[] | null,
): { name: string; value: number }[] {
  const counts: Record<string, number> = {};
  const ws = filterDates ? rawWorkouts.filter((w) => filterDates.includes(w.date)) : rawWorkouts;
  for (const w of ws) {
    for (const e of w.workout_entries) {
      const cat = e.exercises?.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    }
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

/**
 * Exercise weight trend: max weight per workout date for a given exercise name.
 */
function computeExerciseTrend(
  rawWorkouts: RawWorkout[],
  exerciseName: string,
): { date: string; maxWeight: number }[] {
  const byDate: Record<string, number> = {};
  for (const w of rawWorkouts) {
    for (const e of w.workout_entries) {
      if (e.exercises?.name === exerciseName && e.weight > 0) {
        byDate[w.date] = Math.max(byDate[w.date] || 0, e.weight);
      }
    }
  }
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, maxWeight]) => ({
      date: format(new Date(date + 'T12:00:00'), 'MMM d'),
      maxWeight,
    }));
}

/** All unique exercise names from rawWorkouts, sorted */
function extractExerciseNames(rawWorkouts: RawWorkout[]): string[] {
  const names = new Set<string>();
  for (const w of rawWorkouts) {
    for (const e of w.workout_entries) {
      if (e.exercises?.name) names.add(e.exercises.name);
    }
  }
  return Array.from(names).sort();
}

// ── BMI gauge ring ─────────────────────────────────────────────────────────
function BMIGauge({ bmi, category }: { bmi: number; category: string }) {
  const pct = Math.min(Math.max((bmi - 10) / 30, 0), 1);
  const color = category === 'Normal' ? '#10b981' : category === 'Overweight' ? '#f59e0b' : category === 'Obese' ? '#ef4444' : '#6366f1';
  const r = 52, cx = 64, cy = 64;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ * 0.75;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={128} height={100} className="-mb-2">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10}
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
          strokeDashoffset={circ * 0.125}
          strokeLinecap="round" />
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
      {['MON','TUE','WED','THU','FRI','SAT','SUN'].map((d, i) => (
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
        {['MON','TUE','WED','THU','FRI','SAT','SUN'].map((d, i) => (
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
function BodySetupCard({ onSave, title }: { onSave: (h: number, w: number, g: string) => void; title?: string }) {
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
        <h3 className="font-semibold text-white text-sm">{title ?? 'Set up your body profile'}</h3>
        {!title && <span className="text-xs text-slate-500">— unlocks BMI, calories & recommendations</span>}
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
type Tab = 'overview' | 'body' | 'calendar' | 'insights' | 'trends';

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<EnhancedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  // Navigation offsets (0 = current, negative = past)
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  // Selected date(s) for body part distribution sync
  // null = show all-time, array of ISO dates = show only those days
  const [selectedDates, setSelectedDates] = useState<string[] | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string>('');

  // Exercise trends
  const [selectedExercise, setSelectedExercise] = useState<string>('');

  const load = useCallback(async () => {
    const res = await fetch('/api/analytics');
    if (res.status === 401) { router.push('/login'); return; }
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // ── Raw data ───────────────────────────────────────────────────────────
  const rawWorkouts = data?.rawWorkouts ?? [];
  const weightKg = data?.userWeightKg ?? 70;

  // ── Dynamic chart data (recomputed on every offset/selection change) ───
  const weeklyData = useMemo(
    () => computeWeekly(rawWorkouts, weekOffset, weightKg),
    [rawWorkouts, weekOffset, weightKg],
  );

  const monthlyData = useMemo(
    () => computeMonthly(rawWorkouts, monthOffset),
    [rawWorkouts, monthOffset],
  );

  const bodyDistData = useMemo(
    () => computeBodyDist(rawWorkouts, selectedDates),
    [rawWorkouts, selectedDates],
  );

  const exerciseNames = useMemo(() => extractExerciseNames(rawWorkouts), [rawWorkouts]);

  const exerciseTrendData = useMemo(
    () => selectedExercise ? computeExerciseTrend(rawWorkouts, selectedExercise) : [],
    [rawWorkouts, selectedExercise],
  );

  // ── Labels ─────────────────────────────────────────────────────────────
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const wLabel = useMemo(() => {
    if (weekOffset === 0) return 'This Week';
    return `${format(new Date(weekDates[0] + 'T12:00:00'), 'MMM d')} – ${format(new Date(weekDates[6] + 'T12:00:00'), 'MMM d')}`;
  }, [weekOffset, weekDates]);

  const mBase = monthOffset < 0 ? subMonths(new Date(), -monthOffset) : new Date();
  const mLabel = monthOffset === 0 ? format(new Date(), 'MMMM yyyy') : format(mBase, 'MMMM yyyy');

  // ── Bar click handlers (sync body distribution) ────────────────────────
  // Recharts passes the data payload as the first argument — cast via unknown
  function handleWeekBarClick(barData: unknown) {
    const d = barData as { fullDate?: string };
    if (!d.fullDate) return;
    const iso = d.fullDate;
    if (selectedDates?.length === 1 && selectedDates[0] === iso) {
      setSelectedDates(null);
      setSelectedLabel('');
    } else {
      setSelectedDates([iso]);
      setSelectedLabel(format(new Date(iso + 'T12:00:00'), 'MMM d, yyyy'));
    }
  }

  function handleMonthBarClick(barData: unknown) {
    const d = barData as { startDate?: string; endDate?: string };
    if (!d.startDate || !d.endDate) return;
    const filtered = rawWorkouts
      .filter((w) => w.date >= d.startDate! && w.date <= d.endDate!)
      .map((w) => w.date);
    if (filtered.length === 0) {
      setSelectedDates(null);
      setSelectedLabel('');
    } else {
      setSelectedDates(filtered);
      const mStart = format(new Date(d.startDate + 'T12:00:00'), 'MMM d');
      const mEnd = format(new Date(d.endDate + 'T12:00:00'), 'MMM d');
      setSelectedLabel(`${mStart} – ${mEnd}`);
    }
  }

  function clearSelection() {
    setSelectedDates(null);
    setSelectedLabel('');
  }

  // ── Body metrics state callbacks ───────────────────────────────────────
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

  // ── Loading skeleton ───────────────────────────────────────────────────
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
    { key: 'trends',   label: 'Trends',   icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { key: 'calendar', label: 'Calendar', icon: <Calendar className="w-3.5 h-3.5" /> },
    { key: 'insights', label: 'Insights', icon: <Zap className="w-3.5 h-3.5" /> },
  ];

  const hasBody = !!(data?.bodyMetrics?.height_cm && data?.bodyMetrics?.weight_kg);

  // Summary stats for the selected week
  const weekTotalVol = weeklyData.reduce((s, d) => s + d.volume, 0);
  const weekTotalCal = weeklyData.reduce((s, d) => s + d.calories, 0);

  // Earned/unearned badges
  const earnedBadges = data?.badges?.filter(b => b.earned) || [];
  const unearnedBadges = data?.badges?.filter(b => !b.earned) || [];

  return (
    <div className="relative space-y-6 overflow-hidden">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl leading-none tracking-wide text-white sm:text-5xl">ANALYTICS</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your complete training overview</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/6 bg-white/5 p-1 scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              tab === t.key ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {/* All-time stat cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Workouts" value={data?.totalWorkouts ?? 0} icon={<Dumbbell className="w-5 h-5" />} color="violet" />
            <StatCard label="Total Volume" value={formatVolume(data?.totalVolume ?? 0)} icon={<Weight className="w-5 h-5" />} color="violet" />
            <StatCard label="Current Streak" value={`${data?.currentStreak ?? 0}d`} icon={<Flame className="w-5 h-5" />} color="violet" />
            <StatCard label="Longest Streak" value={`${data?.longestStreak ?? 0}d`} icon={<TrendingUp className="w-5 h-5" />} color="violet" />
          </div>

          {/* All-time calorie totals */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: 'Today', value: data?.calories?.today ?? 0, color: 'text-amber-400' },
              { label: 'This Week', value: data?.calories?.week ?? 0, color: 'text-orange-400' },
              { label: 'This Month', value: data?.calories?.month ?? 0, color: 'text-red-400' },
            ].map((c) => (
              <div key={c.label} className="glass-card p-3 sm:p-4 text-center">
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mx-auto mb-1 sm:mb-1.5" />
                <p className={`font-display text-lg sm:text-2xl leading-none ${c.color}`}>{c.value.toLocaleString()}</p>
                <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{c.label}</p>
                <p className="text-[9px] sm:text-[10px] text-slate-600">kcal</p>
              </div>
            ))}
          </div>

          {/* ── Weekly Volume Chart (Sun–Sat, navigable) ──────────────────── */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="font-semibold text-white text-sm">Weekly Overview</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Volume: <span className="text-slate-300">{weekTotalVol.toLocaleString()} kg</span>
                  <span className="mx-1.5 text-slate-700">·</span>
                  Calories: <span className="text-amber-400/80">{weekTotalCal.toLocaleString()} kcal</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setWeekOffset(w => w - 1)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>
                <span className="text-xs text-slate-400 min-w-[96px] text-center">{wLabel}</span>
                <button onClick={() => setWeekOffset(w => Math.min(w + 1, 0))}
                  disabled={weekOffset === 0}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-30">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-600 mb-3">Tap a bar to filter body distribution ↓</p>

            <div className="relative">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyData} barCategoryGap="30%">
                  <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={45} />
                  <Tooltip content={<VolumeTooltip />} cursor={{ fill: 'rgba(225,29,29,0.06)' }} />
                  <Bar
                    dataKey="volume"
                    radius={[5,5,0,0]}
                    cursor="pointer"
                    minPointSize={3}
                    onClick={handleWeekBarClick}
                  >
                    {weeklyData.map((entry) => (
                      <Cell
                        key={entry.fullDate}
                        fill={selectedDates?.includes(entry.fullDate) ? '#ef4444' : '#dc2626'}
                        opacity={
                          entry.volume === 0
                            ? 0.15
                            : selectedDates && !selectedDates.includes(entry.fullDate)
                            ? 0.4
                            : 1
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {!weeklyData.some(d => d.volume > 0) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-slate-600 text-sm">No workouts this week</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Daily Calories Chart (same week, navigable) ────────────────── */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white text-sm">Daily Calories Burned</h2>
              {/* Shares weekOffset navigation — same week as volume chart */}
              <div className="flex items-center gap-2">
                <button onClick={() => setWeekOffset(w => w - 1)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>
                <span className="text-xs text-slate-400 min-w-[96px] text-center">{wLabel}</span>
                <button onClick={() => setWeekOffset(w => Math.min(w + 1, 0))}
                  disabled={weekOffset === 0}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-30">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
            <div className="relative">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={weeklyData} barCategoryGap="35%">
                  <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<CalTooltip />} cursor={{ fill: 'rgba(245,158,11,0.06)' }} />
                  <Bar dataKey="calories" fill="#f59e0b" radius={[5,5,0,0]} minPointSize={3}
                    style={{ opacity: weeklyData.some(d => d.calories > 0) ? 1 : 0.15 }} />
                </BarChart>
              </ResponsiveContainer>
              {!weeklyData.some(d => d.calories > 0) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-slate-600 text-sm">No workouts logged this week</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Monthly + Body Part Distribution ──────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly chart */}
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
              <p className="text-[10px] text-slate-600 mb-3">Tap a bar to filter body distribution →</p>
              <div className="relative">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={monthlyData} barCategoryGap="35%">
                    <XAxis dataKey="week" stroke="#475569" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={25} />
                    <Tooltip content={<MonthTooltip />} cursor={{ fill: 'rgba(225,29,29,0.06)' }} />
                    <Bar
                      dataKey="count"
                      radius={[5,5,0,0]}
                      cursor="pointer"
                      minPointSize={3}
                      onClick={handleMonthBarClick}
                    >
                      {monthlyData.map((entry) => {
                        const isSelected = selectedDates !== null &&
                          rawWorkouts.some(w => w.date >= entry.startDate && w.date <= entry.endDate && selectedDates.includes(w.date));
                        return (
                          <Cell
                            key={entry.week}
                            fill={isSelected ? '#f59e0b' : '#dc2626'}
                            opacity={
                              entry.count === 0
                                ? 0.15
                                : selectedDates && !isSelected
                                ? 0.4
                                : 1
                            }
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {!monthlyData.some(b => b.count > 0) && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-slate-600 text-sm">No workouts this month</p>
                  </div>
                )}
              </div>
            </div>

            {/* Body part distribution */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white text-sm">Body Part Distribution</h2>
                {selectedDates && (
                  <button
                    onClick={clearSelection}
                    className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                    {selectedLabel || 'Clear'}
                  </button>
                )}
              </div>
              {!selectedDates && (
                <p className="text-[10px] text-slate-600 mb-3">All-time · tap a chart bar to filter</p>
              )}
              {bodyDistData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={bodyDistData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {bodyDistData.map((e) => (
                        <Cell key={e.name} fill={CATEGORY_COLORS[e.name] || '#dc2626'} />
                      ))}
                    </Pie>
                    <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                    <Tooltip contentStyle={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-500 text-sm py-8 text-center">
                  {selectedDates ? 'No exercise data for this period' : 'Log workouts to see distribution'}
                </p>
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
                      date: l.logged_at.slice(5),
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
            <BodySetupCard onSave={handleBodySave} title="Update Profile" />
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

      {/* ── TRENDS TAB ───────────────────────────────────────────────────── */}
      {tab === 'trends' && (
        <div className="space-y-5">
          {exerciseNames.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <TrendingUp className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No exercise data yet</p>
              <p className="text-slate-600 text-xs mt-1">Log workouts with exercises to track your strength trends</p>
            </div>
          ) : (
            <>
              {/* Exercise selector */}
              <div className="glass-card p-5">
                <h2 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-red-400" /> Exercise Weight Trend
                </h2>
                <div className="relative">
                  <select
                    value={selectedExercise}
                    onChange={e => setSelectedExercise(e.target.value)}
                    className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/20 pr-10 cursor-pointer"
                  >
                    <option value="" disabled className="bg-[#0f0f0f] text-slate-400">Select an exercise…</option>
                    {exerciseNames.map(name => (
                      <option key={name} value={name} className="bg-[#0f0f0f] text-white">{name}</option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
                </div>
              </div>

              {/* Trend chart */}
              {selectedExercise && (
                <div className="glass-card p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-white text-sm">{selectedExercise}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Max weight lifted per session</p>
                    </div>
                    {exerciseTrendData.length >= 2 && (() => {
                      const delta = exerciseTrendData[exerciseTrendData.length - 1].maxWeight - exerciseTrendData[0].maxWeight;
                      return (
                        <div className={`text-right flex-shrink-0 ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          <p className="text-lg font-bold leading-none">{delta >= 0 ? '+' : ''}{delta.toFixed(1)} kg</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">overall change</p>
                        </div>
                      );
                    })()}
                  </div>

                  {exerciseTrendData.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-slate-500 text-sm">No data for this exercise yet</p>
                    </div>
                  ) : exerciseTrendData.length === 1 ? (
                    <div className="py-6 text-center space-y-2">
                      <p className="text-3xl font-bold text-white">{exerciseTrendData[0].maxWeight} kg</p>
                      <p className="text-xs text-slate-500">Logged once on {exerciseTrendData[0].date}</p>
                      <p className="text-xs text-slate-600">Log more sessions to see a trend</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={exerciseTrendData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                        <XAxis
                          dataKey="date"
                          stroke="#475569"
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          domain={['dataMin - 5', 'dataMax + 5']}
                          stroke="#475569"
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                          width={40}
                          tickFormatter={v => `${v}kg`}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload?.length) {
                              return (
                                <div className="bg-[#0f0f0f] border border-white/10 rounded-xl px-3 py-2 text-sm">
                                  <p className="text-slate-400">{label}</p>
                                  <p className="text-red-400 font-semibold">{payload[0].value} kg</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                          cursor={{ stroke: 'rgba(255,255,255,0.08)' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="maxWeight"
                          stroke="#dc2626"
                          strokeWidth={2.5}
                          dot={{ fill: '#dc2626', r: 4, strokeWidth: 0 }}
                          activeDot={{ r: 6, fill: '#ef4444', strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}

                  {/* Personal best callout */}
                  {exerciseTrendData.length > 0 && (() => {
                    const best = Math.max(...exerciseTrendData.map(d => d.maxWeight));
                    const bestEntry = exerciseTrendData.findLast(d => d.maxWeight === best);
                    return (
                      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Award className="w-4 h-4 text-amber-400" />
                          Personal Best
                        </div>
                        <div className="text-right">
                          <span className="text-amber-400 font-bold text-lg leading-none">{best} kg</span>
                          {bestEntry && <p className="text-[10px] text-slate-600 mt-0.5">{bestEntry.date}</p>}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Instruction when no exercise picked */}
              {!selectedExercise && (
                <div className="glass-card p-6 text-center border-dashed border-white/10">
                  <Activity className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Pick an exercise above to see how your strength has progressed over time</p>
                </div>
              )}
            </>
          )}
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
              // Count distinct workout days in current week from rawWorkouts
              const currentWeekDates = getWeekDates(0);
              const done = currentWeekDates.filter(d => rawWorkouts.some(w => w.date === d)).length;
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
