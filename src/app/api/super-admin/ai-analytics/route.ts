import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

function requireSuperAdmin(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'super_admin') return null;
  return payload;
}

/**
 * GET /api/super-admin/ai-analytics?gym_id=<uuid>
 *
 * Returns aggregated, anonymized AI analytics data for a specific gym.
 * Super admin only.
 *
 * NO phone numbers, passwords, or social content returned.
 * All member references use internal UUIDs only.
 */
export async function GET(req: NextRequest) {
  if (!requireSuperAdmin(req)) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const gymId = searchParams.get('gym_id');
  if (!gymId) {
    return NextResponse.json({ error: 'gym_id required' }, { status: 400 });
  }

  const gymFilter = `gym_id.eq.${gymId},gym_id.is.null`;

  // ── Consent summary ────────────────────────────────────────────────────────
  const { data: consentedProfiles } = await supabaseAdmin
    .from('ai_member_profiles')
    .select('member_id, consent_enabled')
    .or(gymFilter);

  const consentedCount = (consentedProfiles ?? []).filter((p) => p.consent_enabled).length;
  const declinedCount  = (consentedProfiles ?? []).filter((p) => !p.consent_enabled).length;

  // ── Weekly training aggregates (last 12 weeks) ────────────────────────────
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
  const twelveWeeksAgoStr = twelveWeeksAgo.toISOString().split('T')[0];

  const { data: weeklyRows } = await supabaseAdmin
    .from('ai_weekly_training_features')
    .select('week_start, member_id, sessions_completed, weekly_minutes, weekly_volume, adherence_percent, attendance_count')
    .or(gymFilter)
    .gte('week_start', twelveWeeksAgoStr)
    .order('week_start', { ascending: true });

  // Aggregate by week
  const weeklyMap: Record<string, {
    week: string;
    members: number;
    avg_sessions: number;
    avg_volume: number;
    avg_adherence: number;
    total_attendance: number;
  }> = {};

  for (const row of weeklyRows ?? []) {
    if (!weeklyMap[row.week_start]) {
      weeklyMap[row.week_start] = { week: row.week_start, members: 0, avg_sessions: 0, avg_volume: 0, avg_adherence: 0, total_attendance: 0 };
    }
    const w = weeklyMap[row.week_start];
    w.members++;
    w.avg_sessions  += row.sessions_completed   ?? 0;
    w.avg_volume    += row.weekly_volume         ?? 0;
    w.avg_adherence += row.adherence_percent     ?? 0;
    w.total_attendance += row.attendance_count   ?? 0;
  }

  const weeklyTrends = Object.values(weeklyMap).map((w) => ({
    week:              w.week,
    members_active:    w.members,
    avg_sessions:      w.members > 0 ? Math.round((w.avg_sessions  / w.members) * 10) / 10 : 0,
    avg_volume_kg:     w.members > 0 ? Math.round((w.avg_volume    / w.members) * 10) / 10 : 0,
    avg_adherence_pct: w.members > 0 ? Math.round((w.avg_adherence / w.members) * 10) / 10 : 0,
    total_attendance:  w.total_attendance,
  }));

  // ── Exercise strength trends (top 5 exercises, last 12 weeks) ─────────────
  const { data: exerciseRows } = await supabaseAdmin
    .from('ai_exercise_progress')
    .select('exercise_name, week_start, top_weight, total_volume, estimated_1rm')
    .or(gymFilter)
    .gte('week_start', twelveWeeksAgoStr);

  // Group by exercise, average per week
  const exerciseMap: Record<string, Record<string, { total_weight: number; count: number; volume: number }>> = {};
  for (const row of exerciseRows ?? []) {
    if (!exerciseMap[row.exercise_name]) exerciseMap[row.exercise_name] = {};
    if (!exerciseMap[row.exercise_name][row.week_start]) {
      exerciseMap[row.exercise_name][row.week_start] = { total_weight: 0, count: 0, volume: 0 };
    }
    exerciseMap[row.exercise_name][row.week_start].total_weight += row.top_weight ?? 0;
    exerciseMap[row.exercise_name][row.week_start].count++;
    exerciseMap[row.exercise_name][row.week_start].volume += row.total_volume ?? 0;
  }

  const strengthTrends = Object.entries(exerciseMap)
    .slice(0, 5)
    .map(([exercise, weeks]) => ({
      exercise,
      weekly_data: Object.entries(weeks).map(([week, d]) => ({
        week,
        avg_top_weight: d.count > 0 ? Math.round((d.total_weight / d.count) * 10) / 10 : 0,
        avg_volume:     d.count > 0 ? Math.round((d.volume / d.count) * 10) / 10 : 0,
      })).sort((a, b) => a.week.localeCompare(b.week)),
    }));

  // ── Member profile distribution (anonymized) ──────────────────────────────
  const { data: profiles } = await supabaseAdmin
    .from('ai_member_profiles')
    .select('goal, experience_level, consent_enabled')
    .or(gymFilter)
    .eq('consent_enabled', true);

  const goalDist: Record<string, number>       = {};
  const expDist:  Record<string, number>       = {};
  for (const p of profiles ?? []) {
    if (p.goal)             goalDist[p.goal]             = (goalDist[p.goal]             || 0) + 1;
    if (p.experience_level) expDist[p.experience_level]  = (expDist[p.experience_level]  || 0) + 1;
  }

  return NextResponse.json({
    consent_summary: {
      consented: consentedCount,
      declined:  declinedCount,
      total:     consentedCount + declinedCount,
    },
    weekly_trends: weeklyTrends,
    strength_trends: strengthTrends,
    profile_distribution: {
      by_goal:       Object.entries(goalDist).map(([k, v]) => ({ label: k, count: v })),
      by_experience: Object.entries(expDist).map(([k, v])  => ({ label: k, count: v })),
    },
  });
}
