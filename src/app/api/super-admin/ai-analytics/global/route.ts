import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

function requireSuperAdmin(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'super_admin') return null;
  return payload;
}

/**
 * GET /api/super-admin/ai-analytics/global
 * Aggregated AI dataset metrics across ALL gyms.
 * No PII — member_ids are UUIDs only.
 */
export async function GET(req: NextRequest) {
  if (!requireSuperAdmin(req)) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }

  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
  const cutoff = twelveWeeksAgo.toISOString().split('T')[0];

  const [
    { count: consentedCount },
    { count: declinedCount },
    { count: totalWeeklyRows },
    { count: totalExerciseRows },
    { data: weeklyRows },
  ] = await Promise.all([
    supabaseAdmin
      .from('ai_member_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('consent_enabled', true),
    supabaseAdmin
      .from('ai_member_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('consent_enabled', false),
    supabaseAdmin
      .from('ai_weekly_training_features')
      .select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('ai_exercise_progress')
      .select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('ai_weekly_training_features')
      .select('week_start, member_id, sessions_completed, weekly_volume, adherence_percent, avg_progression_score, attendance_count')
      .gte('week_start', cutoff)
      .order('week_start', { ascending: true }),
  ]);

  // Aggregate weekly data across all gyms by week
  const weeklyMap: Record<string, {
    members: number;
    total_volume: number;
    total_adherence: number;
    total_sessions: number;
    total_progression: number;
  }> = {};

  for (const row of weeklyRows ?? []) {
    if (!weeklyMap[row.week_start]) {
      weeklyMap[row.week_start] = { members: 0, total_volume: 0, total_adherence: 0, total_sessions: 0, total_progression: 0 };
    }
    const w = weeklyMap[row.week_start];
    w.members++;
    w.total_volume     += row.weekly_volume         ?? 0;
    w.total_adherence  += row.adherence_percent      ?? 0;
    w.total_sessions   += row.sessions_completed     ?? 0;
    w.total_progression += row.avg_progression_score ?? 0;
  }

  const weeklyTrends = Object.entries(weeklyMap).map(([week, w]) => ({
    week,
    active_members:    w.members,
    avg_volume_kg:     w.members > 0 ? Math.round((w.total_volume     / w.members) * 10) / 10 : 0,
    avg_adherence_pct: w.members > 0 ? Math.round((w.total_adherence  / w.members) * 10) / 10 : 0,
    avg_sessions:      w.members > 0 ? Math.round((w.total_sessions   / w.members) * 10) / 10 : 0,
    avg_progression:   w.members > 0 ? Math.round((w.total_progression / w.members) * 10) / 10 : 0,
  }));

  // Avg workouts per week = avg across all weeks of avg_sessions
  const avgWorkoutsPerWeek = weeklyTrends.length > 0
    ? Math.round((weeklyTrends.reduce((s, w) => s + w.avg_sessions, 0) / weeklyTrends.length) * 10) / 10
    : 0;

  return NextResponse.json({
    summary: {
      consented:          consentedCount  ?? 0,
      declined:           declinedCount   ?? 0,
      total_dataset_rows: (totalWeeklyRows ?? 0) + (totalExerciseRows ?? 0),
      avg_workouts_per_week: avgWorkoutsPerWeek,
    },
    weekly_trends: weeklyTrends,
  });
}
