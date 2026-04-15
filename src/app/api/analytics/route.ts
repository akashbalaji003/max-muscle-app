import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import {
  format,
  subDays,
  endOfWeek,
  eachWeekOfInterval,
  subMonths,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { calculateStreak } from '@/lib/utils';
import type { UserBadge, WorkoutRecommendation, BadgeType } from '@/types';

// ── MET lookup by workout_type ─────────────────────────────────────────────
function getMET(workoutType: string, durationSeconds: number): number {
  const durationHours = durationSeconds / 3600;
  if (workoutType === 'legs') return durationHours > 1 ? 6 : 5;
  if (workoutType === 'push' || workoutType === 'pull') return durationHours > 1 ? 5.5 : 5;
  return durationHours > 1.5 ? 5 : 4; // custom
}

function calcCalories(weightKg: number, met: number, durationSeconds: number): number {
  return Math.round(met * weightKg * (durationSeconds / 3600));
}

// ── BMI helpers ───────────────────────────────────────────────────────────
function calcBMI(weightKg: number, heightCm: number): number {
  const hm = heightCm / 100;
  return Math.round((weightKg / (hm * hm)) * 10) / 10;
}

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

// ── Badge calculator ──────────────────────────────────────────────────────
function calcBadges(
  currentStreak: number,
  longestStreak: number,
  totalWorkouts: number,
  hasPRs: boolean
): UserBadge[] {
  const defs: { type: BadgeType; label: string; description: string; icon: string; condition: boolean }[] = [
    {
      type: 'first_workout',
      label: 'First Rep',
      description: 'Logged your very first workout',
      icon: '🏋️',
      condition: totalWorkouts >= 1,
    },
    {
      type: 'streak_3',
      label: '3-Day Streak',
      description: 'Worked out 3 days in a row',
      icon: '🔥',
      condition: longestStreak >= 3,
    },
    {
      type: 'streak_7',
      label: 'Week Warrior',
      description: '7-day workout streak',
      icon: '⚡',
      condition: longestStreak >= 7,
    },
    {
      type: 'streak_30',
      label: 'Iron Discipline',
      description: '30-day workout streak',
      icon: '🏆',
      condition: longestStreak >= 30,
    },
    {
      type: 'pr_breaker',
      label: 'PR Breaker',
      description: 'Set a personal record',
      icon: '💪',
      condition: hasPRs,
    },
    {
      type: 'century',
      label: 'Century Club',
      description: '100 workouts completed',
      icon: '💯',
      condition: totalWorkouts >= 100,
    },
    {
      type: 'iron_will',
      label: 'Iron Will',
      description: 'Longest streak of 30+ days',
      icon: '🛡️',
      condition: longestStreak >= 30,
    },
  ];

  return defs.map((d) => ({
    type: d.type,
    label: d.label,
    description: d.description,
    icon: d.icon,
    earned: d.condition,
  }));
}

// ── Workout recommendation ────────────────────────────────────────────────
function getRecommendation(
  bmi: number | null,
  goal: string | null
): WorkoutRecommendation | null {
  if (!bmi) return null;

  const cat = bmiCategory(bmi);

  if (bmi >= 30) {
    return {
      split: 'Full-Body + Cardio',
      description:
        'Focus on full-body compound movements combined with steady-state cardio to maximise fat burn and improve cardiovascular health.',
      emphasis: ['Full-body circuits', 'High reps (15–20)', 'Cardio 3× / week', 'Low rest periods'],
      note: 'Consult your gym instructor before following this plan.',
      bmiCategory: cat,
    };
  }

  if (bmi >= 25) {
    return {
      split: 'Full-Body Strength + Moderate Cardio',
      description:
        'Strength training to preserve muscle while a moderate caloric deficit and cardio sessions drive fat loss.',
      emphasis: [
        'Full-body 3× / week',
        'Compound lifts (Squat, Deadlift, Press)',
        'Cardio 2× / week',
        'Moderate reps (10–15)',
      ],
      note: 'Consult your gym instructor before following this plan.',
      bmiCategory: cat,
    };
  }

  if (bmi >= 18.5) {
    const goalBased =
      goal === 'fat_loss'
        ? {
            split: 'PPL + Cardio Mix',
            emphasis: ['Push · Pull · Legs split', 'Hypertrophy range (10–12)', 'Cardio 2× / week'],
          }
        : goal === 'muscle_gain'
        ? {
            split: 'Push · Pull · Legs (PPL)',
            emphasis: [
              'Heavy compound lifts',
              'Strength range (4–8 reps)',
              'Progressive overload',
              'Caloric surplus',
            ],
          }
        : {
            split: 'PPL / Upper-Lower Split',
            emphasis: ['Balanced strength + hypertrophy', 'Moderate reps (8–12)', '4 sessions / week'],
          };

    return {
      split: goalBased.split,
      description:
        'Your BMI is in the normal range. Focus on structured strength training to build or maintain muscle while optimising body composition.',
      emphasis: goalBased.emphasis,
      note: 'Consult your gym instructor before following this plan.',
      bmiCategory: cat,
    };
  }

  // Underweight
  return {
    split: 'Strength Focus',
    description:
      'Priority is building muscle mass through heavy compound lifts and a caloric surplus. Minimise cardio to support weight gain.',
    emphasis: [
      'Compound lifts (Squat, Bench, Deadlift)',
      'Low reps, heavy weight (4–6)',
      'Caloric surplus diet',
      'Limit cardio',
    ],
    note: 'Consult your gym instructor and a nutritionist before following this plan.',
    bmiCategory: cat,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const userId = payload.userId;

  // ── Parallel fetches ──────────────────────────────────────────────────
  const [workoutsRes, userRes, prsRes, attendanceRes, weightLogsRes] = await Promise.all([
    supabaseAdmin
      .from('workouts')
      .select(`id, date, workout_type, duration_seconds, workout_entries(weight, reps, sets, exercises(id, name, category))`)
      .eq('user_id', userId)
      .order('date', { ascending: true }),

    supabaseAdmin
      .from('users')
      .select('height_cm, weight_kg, goal')
      .eq('id', userId)
      .single(),

    supabaseAdmin
      .from('prs')
      .select('id, max_weight, achieved_at, exercises(name, category)')
      .eq('user_id', userId)
      .order('achieved_at', { ascending: false })
      .limit(5),

    supabaseAdmin
      .from('attendance')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: true }),

    supabaseAdmin
      .from('weight_logs')
      .select('id, weight_kg, note, logged_at, created_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: true })
      .limit(52),
  ]);

  const workouts = workoutsRes.data || [];
  const userData = userRes.data;
  const prs = prsRes.data || [];
  const attendance = attendanceRes.data || [];

  // ── Body metrics & BMI ───────────────────────────────────────────────
  const bodyMetrics = {
    height_cm: userData?.height_cm ?? null,
    weight_kg: userData?.weight_kg ?? null,
    goal: (userData?.goal as 'fat_loss' | 'muscle_gain' | 'maintenance' | null) ?? null,
  };

  const userWeightKg = bodyMetrics.weight_kg ?? 70; // default 70 kg for calorie calc
  const bmi =
    bodyMetrics.height_cm && bodyMetrics.weight_kg
      ? calcBMI(bodyMetrics.weight_kg, bodyMetrics.height_cm)
      : null;

  // ── Total stats ──────────────────────────────────────────────────────
  const totalWorkouts = workouts.length;
  let totalVolume = 0;
  const bodyPartCounts: Record<string, number> = {};

  type WEntry = { weight: number; reps: number; sets: number; exercises: { name: string; category: string } };

  for (const w of workouts) {
    for (const entry of (w.workout_entries as unknown as WEntry[])) {
      const vol = entry.weight * entry.reps * entry.sets;
      totalVolume += vol;
      const cat = entry.exercises?.category || 'other';
      bodyPartCounts[cat] = (bodyPartCounts[cat] || 0) + 1;
    }
  }

  // ── Streaks ───────────────────────────────────────────────────────────
  const dates = workouts.map((w) => w.date as string);
  const { current: currentStreak, longest: longestStreak } = calculateStreak(dates);

  // ── Attendance dates (for calendar) ──────────────────────────────────
  const attendanceDates = attendance.map((a) => a.date as string);

  // ── Calorie calculation ───────────────────────────────────────────────
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(subDays(new Date(), 6), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  let totalCalories = 0;
  let weekCalories = 0;
  let monthCalories = 0;
  let todayCalories = 0;
  const calByDate: Record<string, number> = {};

  for (const w of workouts) {
    const dur = (w.duration_seconds as number) || 0;
    // If no timer was used, estimate duration: ~4 min/set, minimum 30 min
    const effectiveDur = dur > 0 ? dur : (() => {
      const totalSets = (w.workout_entries as unknown as WEntry[]).reduce((n, e) => n + (e.sets || 1), 0);
      return Math.max(totalSets * 240, 1800);
    })();
    const met = getMET((w.workout_type as string) || 'custom', effectiveDur);
    const cal = calcCalories(userWeightKg, met, effectiveDur);
    const d = w.date as string;
    calByDate[d] = (calByDate[d] || 0) + cal;
    totalCalories += cal;
    if (d >= weekStart) weekCalories += cal;
    if (d >= monthStart) monthCalories += cal;
    if (d === today) todayCalories += cal;
  }

  // ── Weekly volume (last 7 days) ───────────────────────────────────────
  const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));

  const weeklyWorkouts = last7Days.map((date) => {
    const dayWorkouts = workouts.filter((w) => w.date === date);
    let vol = 0;
    for (const w of dayWorkouts) {
      for (const e of (w.workout_entries as { weight: number; reps: number; sets: number }[])) {
        vol += e.weight * e.reps * e.sets;
      }
    }
    return {
      date: format(new Date(date + 'T00:00:00'), 'EEE'),
      volume: Math.round(vol),
      calories: calByDate[date] || 0,
    };
  });

  // ── Daily calorie breakdown (last 7 days for chart) ───────────────────
  const dailyCalBreakdown = last7Days.map((date) => ({
    date: format(new Date(date + 'T00:00:00'), 'EEE'),
    calories: calByDate[date] || 0,
  }));

  // ── Monthly report (last 4 weeks) ─────────────────────────────────────
  const mStart = subMonths(new Date(), 1);
  const weeks = eachWeekOfInterval({ start: mStart, end: new Date() });
  const monthlyWorkouts = weeks.map((weekStart, i) => {
    const weekEnd = endOfWeek(weekStart);
    const count = workouts.filter((w) => {
      const d = new Date((w.date as string) + 'T00:00:00');
      return d >= weekStart && d <= weekEnd;
    }).length;
    return { week: `W${i + 1}`, count };
  });

  // ── Body part distribution ────────────────────────────────────────────
  const bodyPartDistribution = Object.entries(bodyPartCounts).map(([name, value]) => ({ name, value }));

  // ── Badges ────────────────────────────────────────────────────────────
  const badges = calcBadges(currentStreak, longestStreak, totalWorkouts, prs.length > 0);

  // ── Recommendation ────────────────────────────────────────────────────
  const recommendation = getRecommendation(bmi, bodyMetrics.goal);

  // ── Weight logs ───────────────────────────────────────────────────────
  const weightLogs = (weightLogsRes.data || []).map((l) => ({
    id: l.id as string,
    user_id: userId,
    weight_kg: l.weight_kg as number,
    note: l.note as string | null,
    logged_at: l.logged_at as string,
    created_at: l.created_at as string,
  }));

  return NextResponse.json({
    // Existing
    totalWorkouts,
    totalVolume: Math.round(totalVolume),
    currentStreak,
    longestStreak,
    weeklyWorkouts,
    monthlyWorkouts,
    bodyPartDistribution,
    recentPRs: prs,

    // New: body
    bodyMetrics,
    bmi,
    bmiCategory: bmi ? bmiCategory(bmi) : null,

    // New: calories
    calories: {
      today: todayCalories,
      week: weekCalories,
      month: monthCalories,
      allTime: totalCalories,
      dailyBreakdown: dailyCalBreakdown,
    },

    // New: weight trend
    weightLogs,

    // New: attendance calendar
    attendanceDates,

    // New: gamification
    badges,

    // New: recommendations
    recommendation,

    // Raw workout records — used by the client to compute dynamic date-range charts
    rawWorkouts: workouts.map((w) => ({
      date: w.date as string,
      workout_type: (w.workout_type as string) || 'custom',
      duration_seconds: (w.duration_seconds as number) || 0,
      workout_entries: ((w.workout_entries as unknown as WEntry[]) || []).map((e) => ({
        weight: e.weight,
        reps: e.reps,
        sets: e.sets,
        exercises: e.exercises ? { category: e.exercises.category, name: e.exercises.name } : null,
      })),
    })),
    userWeightKg,
  });
}
