import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

function requireAdmin(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id: userId } = await params;

  // ── User ─────────────────────────────────────────────────────────────────
  const { data: user, error: userErr } = await supabaseAdmin
    .from('users')
    .select('id, phone_number, name, created_at, height_cm, weight_kg, goal')
    .eq('id', userId)
    .single();

  if (userErr || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // ── Membership ────────────────────────────────────────────────────────────
  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('id, start_date, end_date, active, joined_on, last_renewed_on')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // ── Attendance ────────────────────────────────────────────────────────────
  const { data: attendance } = await supabaseAdmin
    .from('attendance')
    .select('date, checked_in_at')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  // ── Workouts with entries ─────────────────────────────────────────────────
  const { data: workouts } = await supabaseAdmin
    .from('workouts')
    .select(`
      id, date, duration_seconds, workout_type, notes,
      workout_entries(
        weight, reps, sets,
        exercises(name, muscle_group, category)
      )
    `)
    .eq('user_id', userId)
    .order('date', { ascending: true });

  // ── Weight logs ───────────────────────────────────────────────────────────
  const { data: weightLogs } = await supabaseAdmin
    .from('weight_logs')
    .select('weight_kg, logged_at')
    .eq('user_id', userId)
    .order('logged_at', { ascending: true });

  return NextResponse.json({
    user,
    membership: membership ?? null,
    attendance: attendance ?? [],
    workouts: workouts ?? [],
    weightLogs: weightLogs ?? [],
  });
}
