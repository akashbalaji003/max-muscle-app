'use client';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Dumbbell, Trophy, ChevronDown, ChevronLeft, ChevronRight, Timer,
  Play, Square, CheckCircle2, Circle, Zap, RotateCcw, Clock, X, Star, QrCode,
} from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { formatDate, CATEGORY_COLORS } from '@/lib/utils';
import type { Exercise, Workout, WorkoutType } from '@/types';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from 'date-fns';

// ── PPL default plans (per-set arrays) ───────────────────────
const PPL_PLANS: Record<
  'push' | 'pull' | 'legs',
  { name: string; defaultSets: { weight: number; reps: number }[] }[]
> = {
  push: [
    { name: 'Bench Press',             defaultSets: [{weight:60,reps:10},{weight:60,reps:10},{weight:60,reps:8}] },
    { name: 'Incline Dumbbell Press',  defaultSets: [{weight:20,reps:10},{weight:20,reps:10},{weight:18,reps:8}] },
    { name: 'Dumbbell Shoulder Press', defaultSets: [{weight:16,reps:10},{weight:16,reps:10},{weight:14,reps:8}] },
    { name: 'Cable Crossover',         defaultSets: [{weight:15,reps:12},{weight:15,reps:12},{weight:15,reps:10}] },
    { name: 'Cable Tricep Pushdown',   defaultSets: [{weight:25,reps:12},{weight:25,reps:12},{weight:22,reps:10}] },
    { name: 'Lateral Raise',           defaultSets: [{weight:8,reps:15},{weight:8,reps:15},{weight:8,reps:12}] },
  ],
  pull: [
    { name: 'Deadlift',     defaultSets: [{weight:80,reps:8},{weight:80,reps:8},{weight:80,reps:6}] },
    { name: 'Lat Pulldown', defaultSets: [{weight:50,reps:10},{weight:50,reps:10},{weight:47,reps:8}] },
    { name: 'Barbell Row',  defaultSets: [{weight:60,reps:10},{weight:60,reps:10},{weight:57,reps:8}] },
    { name: 'Face Pull',    defaultSets: [{weight:20,reps:15},{weight:20,reps:15},{weight:18,reps:12}] },
    { name: 'Barbell Curl', defaultSets: [{weight:30,reps:12},{weight:30,reps:12},{weight:27,reps:10}] },
    { name: 'Hammer Curl',  defaultSets: [{weight:14,reps:12},{weight:14,reps:12},{weight:12,reps:10}] },
  ],
  legs: [
    { name: 'Squat',             defaultSets: [{weight:80,reps:8},{weight:80,reps:8},{weight:80,reps:8},{weight:75,reps:6}] },
    { name: 'Leg Press',         defaultSets: [{weight:120,reps:10},{weight:120,reps:10},{weight:115,reps:8}] },
    { name: 'Romanian Deadlift', defaultSets: [{weight:60,reps:10},{weight:60,reps:10},{weight:57,reps:8}] },
    { name: 'Leg Curl',          defaultSets: [{weight:40,reps:12},{weight:40,reps:12},{weight:37,reps:10}] },
    { name: 'Leg Extension',     defaultSets: [{weight:40,reps:12},{weight:40,reps:12},{weight:37,reps:10}] },
    { name: 'Calf Raise',        defaultSets: [{weight:60,reps:15},{weight:60,reps:15},{weight:60,reps:12},{weight:55,reps:10}] },
  ],
};

const FULL_BODY_PLAN: { name: string; defaultSets: { weight: number; reps: number }[] }[] = [
  { name: 'Squat',           defaultSets: [{weight:60,reps:10},{weight:60,reps:10},{weight:57,reps:8}] },
  { name: 'Bench Press',     defaultSets: [{weight:50,reps:10},{weight:50,reps:10},{weight:47,reps:8}] },
  { name: 'Barbell Row',     defaultSets: [{weight:50,reps:10},{weight:50,reps:10},{weight:47,reps:8}] },
  { name: 'Romanian Deadlift', defaultSets: [{weight:50,reps:12},{weight:50,reps:12},{weight:47,reps:10}] },
  { name: 'Lateral Raise',   defaultSets: [{weight:8,reps:15},{weight:8,reps:15},{weight:8,reps:12}] },
  { name: 'Calf Raise',      defaultSets: [{weight:40,reps:15},{weight:40,reps:15},{weight:40,reps:12}] },
];

const TYPE_COLORS: Record<string, string> = { push:'text-rose-400', pull:'text-blue-400', legs:'text-emerald-400', custom:'text-red-400', full_body:'text-violet-400' };
const TYPE_BG: Record<string, string> = { push:'bg-rose-500', pull:'bg-blue-500', legs:'bg-emerald-500', custom:'bg-red-600', full_body:'bg-violet-600' };
const TYPE_LABELS: Record<string, string> = { push:'Push', pull:'Pull', legs:'Legs', custom:'Custom', full_body:'Full Body' };

interface ProfileSnap {
  bmi: number | null;
  bmiCategory: string | null;
  goal: 'fat_loss' | 'muscle_gain' | 'maintenance' | null;
}

function fmtDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2,'0')}s`;
  return `${s}s`;
}

function fmtRest(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const REST_PRESETS = [
  { label: '1m', secs: 60 },
  { label: '90s', secs: 90 },
  { label: '2m', secs: 120 },
  { label: '3m', secs: 180 },
  { label: '5m', secs: 300 },
];

// ── Data types ────────────────────────────────────────────────

interface SetRow {
  weight: string;
  reps: string;
  completed: boolean;
}

interface ExerciseEntry {
  localId: string;
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  equipment: string;
  sets: SetRow[];
  lastCompletedAt: number | null; // timestamp for rest timer
}

let _idCounter = 0;
function newId() { return String(++_idCounter); }

function makeEmptyEntry(): ExerciseEntry {
  return {
    localId: newId(), exercise_id: '', exercise_name: '',
    muscle_group: '', equipment: '',
    sets: [{ weight: '', reps: '10', completed: false }],
    lastCompletedAt: null,
  };
}

// ── Component ─────────────────────────────────────────────────

export default function WorkoutPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [entries, setEntries] = useState<ExerciseEntry[]>([makeEmptyEntry()]);
  const [notes, setNotes] = useState('');
  const [workoutType, setWorkoutType] = useState<WorkoutType>('custom');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [groupedExercises, setGroupedExercises] = useState<Record<string, Exercise[]>>({});
  const [checkedInToday, setCheckedInToday] = useState<boolean | null>(null);
  const [alreadyLoggedToday, setAlreadyLoggedToday] = useState(false);
  const [restTargetSeconds, setRestTargetSeconds] = useState(180); // 3 minutes default
  const [historyOffset, setHistoryOffset] = useState(0); // 0 = current week, -1 = prev week
  const [profile, setProfile] = useState<ProfileSnap | null>(null);

  // Global workout timer
  const [elapsed, setElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick every second to keep rest timers accurate
  const [, setTick] = useState(0);

  const stopTimer = useCallback(() => {
    setTimerRunning(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    if (intervalRef.current) return;
    setTimerRunning(true);
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, []);

  const resetTimer = useCallback(() => {
    stopTimer();
    setElapsed(0);
  }, [stopTimer]);

  // Global 1-second tick for rest timers
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(id);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    async function load() {
      const [exRes, woRes, attRes, profileRes] = await Promise.all([
        fetch('/api/exercises'),
        fetch('/api/workout?limit=90'),
        fetch('/api/attendance/history?limit=1'),
        fetch('/api/profile'),
      ]);
      if (woRes.status === 401) { router.push('/login'); return; }

      if (exRes.ok) {
        const data = await exRes.json();
        const exList: Exercise[] = data.exercises || [];
        setExercises(exList);
        const grouped: Record<string, Exercise[]> = {};
        exList.forEach((e) => {
          if (!grouped[e.category]) grouped[e.category] = [];
          grouped[e.category].push(e);
        });
        setGroupedExercises(grouped);
      }
      if (woRes.ok) {
        const data = await woRes.json();
        const wos: Workout[] = data.workouts || [];
        setWorkouts(wos);
        const today = new Date().toISOString().split('T')[0];
        setAlreadyLoggedToday(wos.some((w) => w.date === today));
      }
      if (attRes.ok) {
        const att = await attRes.json();
        const today = new Date().toISOString().split('T')[0];
        setCheckedInToday(att.attendance?.[0]?.date === today);
      }
      if (profileRes.ok) {
        const p = await profileRes.json();
        setProfile({ bmi: p.bmi ?? null, bmiCategory: p.bmiCategory ?? null, goal: p.goal ?? null });
      }
    }
    load();
  }, [router]);

  function loadPPLPlan(type: 'push' | 'pull' | 'legs') {
    const plan = PPL_PLANS[type];
    const mapped: ExerciseEntry[] = plan.map((p) => {
      const ex = exercises.find((e) => e.name === p.name);
      return {
        localId: newId(),
        exercise_id: ex?.id || '',
        exercise_name: p.name,
        muscle_group: ex?.muscle_group || '',
        equipment: ex?.equipment || '',
        sets: p.defaultSets.map((s) => ({ weight: String(s.weight), reps: String(s.reps), completed: false })),
        lastCompletedAt: null,
      };
    });
    setEntries(mapped);
    setWorkoutType(type);
    setShowForm(true);
    resetTimer();
    startTimer();
  }

  function loadFullBodyPlan() {
    const mapped: ExerciseEntry[] = FULL_BODY_PLAN.map((p) => {
      const ex = exercises.find((e) => e.name === p.name);
      return {
        localId: newId(),
        exercise_id: ex?.id || '',
        exercise_name: p.name,
        muscle_group: ex?.muscle_group || '',
        equipment: ex?.equipment || '',
        sets: p.defaultSets.map((s) => ({ weight: String(s.weight), reps: String(s.reps), completed: false })),
        lastCompletedAt: null,
      };
    });
    setEntries(mapped);
    setWorkoutType('custom'); // full_body saved as custom for compatibility
    setShowForm(true);
    resetTimer();
    startTimer();
  }

  function openCustom() {
    setEntries([makeEmptyEntry()]);
    setWorkoutType('custom');
    setShowForm(true);
    resetTimer();
    startTimer();
  }

  function updateExercise(localId: string, exercise_id: string) {
    const ex = exercises.find((e) => e.id === exercise_id);
    setEntries((prev) => prev.map((entry) =>
      entry.localId !== localId ? entry : {
        ...entry, exercise_id,
        exercise_name: ex?.name || '',
        muscle_group: ex?.muscle_group || '',
        equipment: ex?.equipment || '',
      }
    ));
  }

  function updateSet(localId: string, setIdx: number, field: keyof SetRow, value: string | boolean) {
    setEntries((prev) => prev.map((entry) => {
      if (entry.localId !== localId) return entry;
      const newSets = entry.sets.map((s, i) => i === setIdx ? { ...s, [field]: value } : s);
      const lastCompletedAt = (field === 'completed' && value === true) ? Date.now() : entry.lastCompletedAt;
      return { ...entry, sets: newSets, lastCompletedAt };
    }));
  }

  function addSet(localId: string) {
    setEntries((prev) => prev.map((entry) => {
      if (entry.localId !== localId) return entry;
      const last = entry.sets[entry.sets.length - 1];
      return { ...entry, sets: [...entry.sets, { weight: last?.weight || '', reps: last?.reps || '10', completed: false }] };
    }));
  }

  function removeSet(localId: string, setIdx: number) {
    setEntries((prev) => prev.map((entry) => {
      if (entry.localId !== localId || entry.sets.length <= 1) return entry;
      return { ...entry, sets: entry.sets.filter((_, i) => i !== setIdx) };
    }));
  }

  function addExercise() { setEntries((prev) => [...prev, makeEmptyEntry()]); }
  function removeExercise(localId: string) { setEntries((prev) => prev.filter((e) => e.localId !== localId)); }

  async function handleFinish() {
    setError('');

    // Flatten to per-set rows
    const entryRows: { exercise_id: string; weight: number; reps: number; sets: number }[] = [];
    for (const entry of entries) {
      if (!entry.exercise_id) continue;
      for (const set of entry.sets) {
        if (set.weight && set.reps) {
          entryRows.push({ exercise_id: entry.exercise_id, weight: parseFloat(set.weight), reps: parseInt(set.reps), sets: 1 });
        }
      }
    }
    if (entryRows.length === 0) { setError('Add at least one exercise with weight and reps.'); return; }

    stopTimer();
    setSaving(true);

    const res = await fetch('/api/workout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, workout_type: workoutType, duration_seconds: elapsed, entries: entryRows }),
    });

    const data = await res.json();
    setSaving(false);

    if (res.status === 403) { setError(data.error || 'Check in at the gym first.'); startTimer(); return; }
    if (!res.ok) { setError(data.error || 'Failed to save workout.'); startTimer(); return; }

    setSuccess(`${TYPE_LABELS[workoutType]} workout saved! ${fmtDuration(elapsed)} 💪`);
    setShowForm(false);
    setEntries([makeEmptyEntry()]);
    setNotes('');
    resetTimer();
    setAlreadyLoggedToday(true); // still track for the "logged today" banner

    const woRes = await fetch('/api/workout?limit=90');
    if (woRes.ok) { const d = await woRes.json(); setWorkouts(d.workouts || []); }
    setTimeout(() => setSuccess(''), 4000);
  }

  function cancelWorkout() {
    stopTimer(); resetTimer();
    setShowForm(false);
    setEntries([makeEmptyEntry()]);
    setNotes(''); setError('');
  }

  const completedSets = entries.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0);
  const totalSets = entries.reduce((n, e) => n + e.sets.length, 0);

  // ── History filter (7-day week windows) ───────────────────────────────
  const { historyWeekStart, historyWeekEnd, historyLabel, filteredWorkouts } = useMemo(() => {
    const today = new Date();
    const base = historyOffset < 0 ? subWeeks(today, -historyOffset) : today;
    const wStart = startOfWeek(base, { weekStartsOn: 1 }); // Mon start
    const wEnd = endOfWeek(base, { weekStartsOn: 1 });
    const startIso = format(wStart, 'yyyy-MM-dd');
    const endIso = format(wEnd, 'yyyy-MM-dd');
    const label = historyOffset === 0
      ? 'This Week'
      : `${format(wStart, 'MMM d')} – ${format(wEnd, 'MMM d')}`;
    const filtered = workouts.filter((w) => w.date >= startIso && w.date <= endIso);
    return { historyWeekStart: startIso, historyWeekEnd: endIso, historyLabel: label, filteredWorkouts: filtered };
  }, [workouts, historyOffset]);

  // ── Smart quick-start recommendation ─────────────────────────────────
  const quickStartConfig = useMemo(() => {
    if (!profile?.bmi) {
      // No profile: default PPL + custom
      return {
        primary: null as string | null,
        cards: [
          { type: 'push' as const, label: 'Push', count: PPL_PLANS.push.length, recommended: false, action: () => loadPPLPlan('push') },
          { type: 'pull' as const, label: 'Pull', count: PPL_PLANS.pull.length, recommended: false, action: () => loadPPLPlan('pull') },
          { type: 'legs' as const, label: 'Legs', count: PPL_PLANS.legs.length, recommended: false, action: () => loadPPLPlan('legs') },
          { type: 'custom' as const, label: 'Custom', count: 0, recommended: false, action: openCustom },
        ],
      };
    }
    const bmi = profile.bmi;
    const goal = profile.goal;

    if (bmi >= 25) {
      // Overweight/Obese: recommend Full Body
      return {
        primary: 'full_body',
        cards: [
          { type: 'full_body' as const, label: 'Full Body', count: FULL_BODY_PLAN.length, recommended: true, action: loadFullBodyPlan },
          { type: 'push' as const, label: 'Push', count: PPL_PLANS.push.length, recommended: false, action: () => loadPPLPlan('push') },
          { type: 'legs' as const, label: 'Legs', count: PPL_PLANS.legs.length, recommended: false, action: () => loadPPLPlan('legs') },
          { type: 'custom' as const, label: 'Custom', count: 0, recommended: false, action: openCustom },
        ],
      };
    }

    if (bmi < 18.5) {
      // Underweight: recommend compound push
      return {
        primary: 'push',
        cards: [
          { type: 'push' as const, label: 'Push', count: PPL_PLANS.push.length, recommended: true, action: () => loadPPLPlan('push') },
          { type: 'pull' as const, label: 'Pull', count: PPL_PLANS.pull.length, recommended: false, action: () => loadPPLPlan('pull') },
          { type: 'legs' as const, label: 'Legs', count: PPL_PLANS.legs.length, recommended: false, action: () => loadPPLPlan('legs') },
          { type: 'custom' as const, label: 'Custom', count: 0, recommended: false, action: openCustom },
        ],
      };
    }

    // Normal BMI
    if (goal === 'muscle_gain') {
      return {
        primary: 'push',
        cards: [
          { type: 'push' as const, label: 'Push', count: PPL_PLANS.push.length, recommended: true, action: () => loadPPLPlan('push') },
          { type: 'pull' as const, label: 'Pull', count: PPL_PLANS.pull.length, recommended: false, action: () => loadPPLPlan('pull') },
          { type: 'legs' as const, label: 'Legs', count: PPL_PLANS.legs.length, recommended: false, action: () => loadPPLPlan('legs') },
          { type: 'custom' as const, label: 'Custom', count: 0, recommended: false, action: openCustom },
        ],
      };
    }

    if (goal === 'fat_loss') {
      return {
        primary: 'full_body',
        cards: [
          { type: 'full_body' as const, label: 'Full Body', count: FULL_BODY_PLAN.length, recommended: true, action: loadFullBodyPlan },
          { type: 'push' as const, label: 'Push', count: PPL_PLANS.push.length, recommended: false, action: () => loadPPLPlan('push') },
          { type: 'legs' as const, label: 'Legs', count: PPL_PLANS.legs.length, recommended: false, action: () => loadPPLPlan('legs') },
          { type: 'custom' as const, label: 'Custom', count: 0, recommended: false, action: openCustom },
        ],
      };
    }

    // Maintenance / default
    return {
      primary: null,
      cards: [
        { type: 'push' as const, label: 'Push', count: PPL_PLANS.push.length, recommended: false, action: () => loadPPLPlan('push') },
        { type: 'pull' as const, label: 'Pull', count: PPL_PLANS.pull.length, recommended: false, action: () => loadPPLPlan('pull') },
        { type: 'legs' as const, label: 'Legs', count: PPL_PLANS.legs.length, recommended: false, action: () => loadPPLPlan('legs') },
        { type: 'custom' as const, label: 'Custom', count: 0, recommended: false, action: openCustom },
      ],
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, exercises]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl sm:text-5xl text-white leading-none">WORKOUT LOGGER</h1>
        <p className="text-sm text-slate-400 mt-0.5">Track your training sessions</p>
      </div>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm text-emerald-400 font-medium">
          {success}
        </div>
      )}

      {/* Status banners */}
      {!showForm && alreadyLoggedToday && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-emerald-300 text-sm font-medium">Workout logged today! 💪</p>
            <p className="text-slate-500 text-xs mt-0.5">You can log another session — keep it up!</p>
          </div>
        </div>
      )}

      {/* ── Check-in gate ── */}
      {!showForm && checkedInToday === false && !alreadyLoggedToday && (
        <div className="glass-card rounded-2xl p-6 border-amber-500/25 bg-amber-500/5 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <QrCode className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <p className="text-base font-bold text-white">Check in first</p>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              You must scan your QR code at the gym before you can log a workout for today.
            </p>
          </div>
          <Link
            href="/checkin"
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95"
          >
            <QrCode className="w-4 h-4" /> Go to Check-In
          </Link>
        </div>
      )}

      {/* Quick-start cards */}
      {!showForm && (
        <div className={checkedInToday === false ? 'opacity-30 pointer-events-none select-none' : ''}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Quick Start</p>
            {quickStartConfig.primary && profile?.bmiCategory && checkedInToday !== false && (
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400" />
                Based on your {profile.bmiCategory} BMI
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickStartConfig.cards.map((card) => (
              <button
                key={card.type}
                onClick={card.action}
                disabled={checkedInToday === false}
                className={`relative glass-card p-4 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 ${
                  card.recommended
                    ? 'border-amber-500/40 hover:border-amber-500/70 bg-amber-500/5'
                    : card.type === 'custom'
                    ? 'hover:border-red-600/50 border-dashed'
                    : 'hover:border-red-600/50'
                }`}
              >
                {card.recommended && (
                  <div className="absolute -top-2 -right-2 bg-amber-500 text-[9px] font-bold text-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-md">
                    <Star className="w-2.5 h-2.5 fill-current" /> REC
                  </div>
                )}
                <div className={`text-lg font-bold ${TYPE_COLORS[card.type] || 'text-red-400'} mb-1`}>{card.label}</div>
                <div className="text-xs text-slate-500">
                  {card.count > 0 ? `${card.count} exercises` : 'Build your own'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Workout Form ── */}
      {showForm && (
        <div className="space-y-4">
          {/* Sticky timer bar */}
          <div className="sticky top-14 lg:top-2 z-20 bg-[#000000]/95 backdrop-blur border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <Timer className={`w-4 h-4 ${timerRunning ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="text-xl font-mono font-bold text-white">{fmtDuration(elapsed)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_COLORS[workoutType]} bg-white/5`}>
                {TYPE_LABELS[workoutType]}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {timerRunning ? (
                <button onClick={stopTimer} className="p-2 text-amber-400 hover:text-amber-300 min-h-[40px] min-w-[40px]">
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button onClick={startTimer} className="p-2 text-emerald-400 hover:text-emerald-300 min-h-[40px] min-w-[40px]">
                  <Play className="w-4 h-4 fill-current" />
                </button>
              )}
              <button onClick={resetTimer} className="p-2 text-slate-500 hover:text-slate-300 min-h-[40px] min-w-[40px]">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">{error}</div>
          )}

          {/* Type selector */}
          <div className="flex gap-2 flex-wrap">
            {(['push', 'pull', 'legs', 'custom'] as WorkoutType[]).map((t) => (
              <button
                key={t}
                onClick={() => setWorkoutType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${workoutType === t ? 'bg-red-700 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Rest timer target selector */}
          <div className="flex items-center gap-2 flex-wrap bg-[#000000] rounded-xl px-3 py-2.5 border border-white/5">
            <span className="text-xs text-slate-500 font-medium flex-shrink-0">Rest timer:</span>
            <div className="flex gap-1.5 flex-wrap">
              {REST_PRESETS.map((p) => (
                <button
                  key={p.secs}
                  onClick={() => setRestTargetSeconds(p.secs)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all min-h-[30px] ${restTargetSeconds === p.secs ? 'bg-red-700 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-600 ml-auto flex-shrink-0">
              {fmtRest(restTargetSeconds)} countdown
            </span>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Sets completed</span>
              <span className="text-slate-400 font-medium">{completedSets} / {totalSets}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${totalSets ? (completedSets / totalSets) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Exercise entries */}
          <div className="space-y-3">
            {entries.map((entry) => {
              const restElapsed = entry.lastCompletedAt
                ? Math.floor((Date.now() - entry.lastCompletedAt) / 1000)
                : 0;
              const restRemaining = entry.lastCompletedAt
                ? Math.max(0, restTargetSeconds - restElapsed)
                : null;
              const restDone = restRemaining === 0;
              const allDone = entry.sets.length > 0 && entry.sets.every((s) => s.completed);

              return (
                <div
                  key={entry.localId}
                  className={`rounded-xl border overflow-hidden transition-all ${allDone ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/8 bg-[#000000]'}`}
                >
                  {/* Exercise header row */}
                  <div className="flex items-start gap-2 p-3">
                    <div className="flex-1 min-w-0">
                      <select
                        value={entry.exercise_id}
                        onChange={(e) => updateExercise(entry.localId, e.target.value)}
                        className="w-full bg-[#0f0f0f] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-red-600 min-h-[44px]"
                      >
                        <option value="">Select exercise...</option>
                        {Object.entries(groupedExercises).map(([cat, exs]) => (
                          <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                            {exs.map((ex) => (
                              <option key={ex.id} value={ex.id}>{ex.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {(entry.muscle_group || entry.equipment) && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {entry.muscle_group && (
                            <span className="text-xs bg-red-600/10 text-red-300 px-2 py-0.5 rounded-full border border-red-600/20">
                              🎯 {entry.muscle_group}
                            </span>
                          )}
                          {entry.equipment && (
                            <span className="text-xs bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20">
                              🏋️ {entry.equipment}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeExercise(entry.localId)}
                      className="p-2 text-slate-700 hover:text-red-400 transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Set rows */}
                  <div className="px-3 pb-3">
                    {/* Column headers */}
                    <div className="grid grid-cols-[32px_1fr_1fr_44px] gap-2 mb-1 px-1">
                      <span className="text-[10px] text-slate-600 font-medium text-center">SET</span>
                      <span className="text-[10px] text-slate-600 font-medium text-center">KG</span>
                      <span className="text-[10px] text-slate-600 font-medium text-center">REPS</span>
                      <span className="text-[10px] text-slate-600 font-medium text-center">✓</span>
                    </div>

                    {entry.sets.map((set, setIdx) => (
                      <div
                        key={setIdx}
                        className={`grid grid-cols-[32px_1fr_1fr_44px] gap-2 mb-2 items-center ${set.completed ? 'opacity-70' : ''}`}
                      >
                        <button
                          onClick={() => removeSet(entry.localId, setIdx)}
                          className={`text-xs font-bold text-center rounded-md h-10 transition-all active:scale-95 ${
                            set.completed
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-slate-500 bg-white/5 hover:bg-red-500/10 hover:text-red-400'
                          }`}
                          title="Long press to remove"
                        >
                          {setIdx + 1}
                        </button>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.5"
                          placeholder="0"
                          value={set.weight}
                          onChange={(e) => updateSet(entry.localId, setIdx, 'weight', e.target.value)}
                          className="bg-[#0f0f0f] border border-slate-700 rounded-lg px-2 h-10 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-600 text-center [appearance:textfield] w-full"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={set.reps}
                          onChange={(e) => updateSet(entry.localId, setIdx, 'reps', e.target.value)}
                          className="bg-[#0f0f0f] border border-slate-700 rounded-lg px-2 h-10 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-600 text-center [appearance:textfield] w-full"
                        />
                        <button
                          onClick={() => updateSet(entry.localId, setIdx, 'completed', !set.completed)}
                          className={`flex items-center justify-center h-10 rounded-lg transition-all active:scale-95 ${
                            set.completed
                              ? 'text-emerald-400 bg-emerald-500/15'
                              : 'text-slate-600 hover:text-slate-300 bg-white/5'
                          }`}
                        >
                          {set.completed
                            ? <CheckCircle2 className="w-5 h-5" />
                            : <Circle className="w-5 h-5" />}
                        </button>
                      </div>
                    ))}

                    {/* Footer: add set + rest timer countdown */}
                    <div className="flex items-center justify-between pt-1 gap-2">
                      <button
                        onClick={() => addSet(entry.localId)}
                        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors min-h-[36px] px-1 flex-shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Set
                      </button>
                      {restRemaining !== null && (
                        restDone ? (
                          <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium animate-pulse">
                            <Zap className="w-3 h-3" />
                            <span>Rest done! Start next set</span>
                          </div>
                        ) : (
                          <div className={`flex items-center gap-1 text-xs font-mono font-semibold ${
                            restRemaining <= 30 ? 'text-red-400' :
                            restRemaining <= 60 ? 'text-amber-400' :
                            'text-emerald-400'
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>{fmtRest(restRemaining)}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add exercise button */}
          <button
            onClick={addExercise}
            className="flex items-center justify-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors min-h-[44px] w-full border border-dashed border-red-600/30 rounded-xl hover:border-red-600/60 hover:bg-red-600/5"
          >
            <Plus className="w-4 h-4" /> Add Exercise
          </button>

          {/* Notes */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Session notes (optional)..."
            rows={2}
            className="w-full bg-[#000000] border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-600 resize-none"
          />

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button onClick={handleFinish} loading={saving} className="flex-1" size="lg">
              <Zap className="w-4 h-4" /> Finish Workout
            </Button>
            <Button variant="secondary" onClick={cancelWorkout} size="lg">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Workout History ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">History</h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setHistoryOffset(o => o - 1)}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            <span className="text-xs text-slate-400 min-w-[80px] text-center">{historyLabel}</span>
            <button
              onClick={() => setHistoryOffset(o => Math.min(o + 1, 0))}
              disabled={historyOffset === 0}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {filteredWorkouts.length === 0 && !showForm && (
            <div className="glass-card p-10 text-center">
              <Dumbbell className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">
                {workouts.length === 0 ? 'No workouts yet. Pick a plan above!' : 'No workouts this week'}
              </p>
              {workouts.length > 0 && filteredWorkouts.length === 0 && (
                <p className="text-xs text-slate-600 mt-1">Navigate back to see past workouts</p>
              )}
            </div>
          )}
          {filteredWorkouts.map((w) => {
            type E = { id: string; weight: number; reps: number; sets: number; exercises?: { id: string; name: string; category: string; muscle_group?: string } };
            const rawEntries = (w.workout_entries || w.entries || []) as unknown as E[];

            // Aggregate sets per exercise for display
            const exerciseMap = new Map<string, { name: string; category: string; muscle_group?: string; totalSets: number; maxWeight: number; totalReps: number }>();
            for (const e of rawEntries) {
              const key = e.exercises?.name || 'Unknown';
              const existing = exerciseMap.get(key);
              if (existing) {
                existing.totalSets += e.sets;
                existing.maxWeight = Math.max(existing.maxWeight, e.weight);
                existing.totalReps = e.reps;
              } else {
                exerciseMap.set(key, {
                  name: e.exercises?.name || 'Unknown',
                  category: e.exercises?.category || '',
                  muscle_group: e.exercises?.muscle_group,
                  totalSets: e.sets,
                  maxWeight: e.weight,
                  totalReps: e.reps,
                });
              }
            }
            const groupedList = Array.from(exerciseMap.values());
            const totalVol = rawEntries.reduce((s, e) => s + e.weight * e.reps * e.sets, 0);
            const wType = w.workout_type || 'custom';

            return (
              <details key={w.id} className="glass-card overflow-hidden group">
                <summary className="flex items-center gap-3 p-4 cursor-pointer list-none hover:bg-white/2 transition-colors select-none">
                  <div className={`w-2 h-10 rounded-full flex-shrink-0 ${TYPE_BG[wType] || 'bg-red-600'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-white text-sm">{formatDate(w.date, 'EEE, MMM dd')}</p>
                      <span className={`text-xs font-semibold ${TYPE_COLORS[wType]}`}>{TYPE_LABELS[wType]}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {groupedList.length} exercises
                      {totalVol > 0 && ` · ${Math.round(totalVol).toLocaleString()} kg`}
                      {w.duration_seconds && w.duration_seconds > 0 && ` · ${fmtDuration(w.duration_seconds)}`}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>

                <div className="border-t border-white/5 divide-y divide-white/5">
                  {groupedList.map((e, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: CATEGORY_COLORS[e.category] || '#6366f1' }}
                        />
                        <div className="min-w-0">
                          <p className="text-slate-200 text-sm font-medium truncate">{e.name}</p>
                          {e.muscle_group && <p className="text-xs text-slate-600 truncate">{e.muscle_group}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-shrink-0 ml-3">
                        <span className="text-slate-500">{e.totalSets} sets</span>
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          <Trophy className="w-3 h-3" />{e.maxWeight}kg
                        </span>
                      </div>
                    </div>
                  ))}
                  {w.notes && (
                    <p className="px-4 py-2 text-xs text-slate-500 italic">{w.notes}</p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
