import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

function requireAdmin(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

const VALID_PLANS = ['push_pull_legs', 'full_body', 'upper_lower', 'custom'];

/**
 * PATCH /api/admin/members/[id]/plan
 *
 * Admin-only. Override or reset a member's workout plan.
 * Body:
 *   { assigned_plan: string | null }
 *     - Pass null to reset to system-generated plan
 *     - Pass a preset key ('push_pull_legs' | 'full_body' | 'upper_lower') to assign a preset
 *
 *   { assigned_plan: 'custom', custom_plan: CustomDay[] }
 *     - Full custom plan with days, exercises, sets, reps, weights
 *     - CustomDay: { day: string, exercises: CustomExercise[] }
 *     - CustomExercise: { exercise_id, exercise_name, muscle_group, equipment, sets: { weight, reps }[] }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id: userId } = await params;
  const body = await req.json();
  const { assigned_plan, custom_plan } = body;

  // null = reset to system
  if (assigned_plan !== null && !VALID_PLANS.includes(assigned_plan)) {
    return NextResponse.json(
      { error: `Invalid plan. Choose from: ${VALID_PLANS.join(', ')} or null to reset.` },
      { status: 400 }
    );
  }

  let updates: Record<string, unknown>;

  if (assigned_plan === null) {
    // Reset — clear both assigned_plan and custom_plan
    updates = { assigned_plan: null, plan_source: 'system', custom_plan: null };
  } else if (assigned_plan === 'custom' && custom_plan !== undefined) {
    // Full custom plan
    if (!Array.isArray(custom_plan)) {
      return NextResponse.json({ error: 'custom_plan must be an array of days' }, { status: 400 });
    }
    updates = { assigned_plan: 'custom', plan_source: 'admin', custom_plan };
  } else {
    // Preset plan — clear any existing custom_plan
    updates = { assigned_plan, plan_source: 'admin', custom_plan: null };
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }

  return NextResponse.json({
    message: assigned_plan
      ? `Plan set to ${assigned_plan} (admin override)`
      : 'Plan reset to system recommendation',
    assigned_plan: assigned_plan ?? null,
    plan_source: assigned_plan ? 'admin' : 'system',
    custom_plan: updates.custom_plan ?? null,
  });
}
