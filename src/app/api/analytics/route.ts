import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { format, subDays, startOfWeek, endOfWeek, eachWeekOfInterval, subMonths } from 'date-fns';
import { calculateStreak } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const userId = payload.userId;

  // ── All workouts with entries ──────────────────────────────
  const { data: workouts } = await supabaseAdmin
    .from('workouts')
    .select(`
      id, date,
      workout_entries (
        weight, reps, sets,
        exercises (category)
      )
    `)
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (!workouts) return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });

  // ── Total stats ────────────────────────────────────────────
  const totalWorkouts = workouts.length;
  let totalVolume = 0;
  const bodyPartCounts: Record<string, number> = {};

  for (const w of workouts) {
    for (const entry of (w.workout_entries as unknown as { weight: number; reps: number; sets: number; exercises: { category: string } }[])) {
      const vol = entry.weight * entry.reps * entry.sets;
      totalVolume += vol;
      const cat = entry.exercises?.category || 'other';
      bodyPartCounts[cat] = (bodyPartCounts[cat] || 0) + 1;
    }
  }

  // ── Streak ─────────────────────────────────────────────────
  const dates = workouts.map((w) => w.date as string);
  const { current: currentStreak, longest: longestStreak } = calculateStreak(dates);

  // ── Weekly volume (last 7 days) ────────────────────────────
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    return format(d, 'yyyy-MM-dd');
  });

  const weeklyWorkouts = last7Days.map((date) => {
    const dayWorkouts = workouts.filter((w) => w.date === date);
    let vol = 0;
    for (const w of dayWorkouts) {
      for (const e of (w.workout_entries as { weight: number; reps: number; sets: number }[])) {
        vol += e.weight * e.reps * e.sets;
      }
    }
    return { date: format(new Date(date + 'T00:00:00'), 'EEE'), volume: Math.round(vol) };
  });

  // ── Monthly report (last 4 weeks) ─────────────────────────
  const monthStart = subMonths(new Date(), 1);
  const weeks = eachWeekOfInterval({ start: monthStart, end: new Date() });
  const monthlyWorkouts = weeks.map((weekStart, i) => {
    const weekEnd = endOfWeek(weekStart);
    const count = workouts.filter((w) => {
      const d = new Date(w.date + 'T00:00:00');
      return d >= weekStart && d <= weekEnd;
    }).length;
    return { week: `W${i + 1}`, count };
  });

  // ── Body part distribution ─────────────────────────────────
  const bodyPartDistribution = Object.entries(bodyPartCounts).map(([name, value]) => ({ name, value }));

  // ── Recent PRs ─────────────────────────────────────────────
  const { data: prs } = await supabaseAdmin
    .from('prs')
    .select('id, max_weight, achieved_at, exercises(name, category)')
    .eq('user_id', userId)
    .order('achieved_at', { ascending: false })
    .limit(5);

  return NextResponse.json({
    totalWorkouts,
    totalVolume: Math.round(totalVolume),
    currentStreak,
    longestStreak,
    weeklyWorkouts,
    monthlyWorkouts,
    bodyPartDistribution,
    recentPRs: prs || [],
  });
}
