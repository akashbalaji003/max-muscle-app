import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

function requireSuperAdmin(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'super_admin') return null;
  return payload;
}

/**
 * GET /api/super-admin/ai-analytics/member/[memberId]
 * Anonymised detail for a single AI-dataset member.
 * NO phone_number, NO name. UUID only.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  if (!requireSuperAdmin(req)) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }

  const { memberId } = await params;

  const [{ data: profile }, { data: weeklyRows }, { data: exerciseRows }] = await Promise.all([
    supabaseAdmin
      .from('ai_member_profiles')
      .select('member_id, gym_id, goal, experience_level, height_cm, baseline_weight_kg, consent_enabled')
      .eq('member_id', memberId)
      .maybeSingle(),
    supabaseAdmin
      .from('ai_weekly_training_features')
      .select('week_start, sessions_completed, weekly_minutes, weekly_volume, adherence_percent, top_exercises, muscle_group_distribution, assigned_plan, plan_source, weight_kg, avg_progression_score, attendance_count')
      .eq('member_id', memberId)
      .order('week_start', { ascending: true }),
    supabaseAdmin
      .from('ai_exercise_progress')
      .select('exercise_name, week_start, top_weight, total_volume, estimated_1rm, progress_delta')
      .eq('member_id', memberId)
      .order('week_start', { ascending: true }),
  ]);

  if (!profile) {
    return NextResponse.json({ error: 'Member not found in AI dataset' }, { status: 404 });
  }
  if (!profile.consent_enabled) {
    return NextResponse.json({ error: 'Member consent not active' }, { status: 403 });
  }

  // Group exercise rows by exercise name
  const exerciseGroups: Record<string, { week: string; top_weight: number; estimated_1rm: number | null }[]> = {};
  for (const row of exerciseRows ?? []) {
    if (!exerciseGroups[row.exercise_name]) exerciseGroups[row.exercise_name] = [];
    exerciseGroups[row.exercise_name].push({
      week:          row.week_start,
      top_weight:    row.top_weight    ?? 0,
      estimated_1rm: row.estimated_1rm ?? null,
    });
  }

  return NextResponse.json({
    profile,
    weekly_logs:       weeklyRows ?? [],
    exercise_progress: Object.entries(exerciseGroups).map(([name, data]) => ({ name, data })),
  });
}
