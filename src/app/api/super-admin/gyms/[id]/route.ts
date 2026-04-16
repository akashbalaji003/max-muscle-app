import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

function requireSuperAdmin(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'super_admin') return null;
  return payload;
}

// Helper: last N months as ISO date strings (first day of each month)
function lastNMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().split('T')[0]);
  }
  return months;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!requireSuperAdmin(req)) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }

  const { id: gymId } = await params;

  // ── Gym profile ─────────────────────────────────────────────────────────────
  const { data: gym, error: gymErr } = await supabaseAdmin
    .from('gyms')
    .select('id, name, slug, logo_url, address, phone, status, created_at')
    .eq('id', gymId)
    .single();

  if (gymErr || !gym) {
    return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
  }

  // ── Subscription ─────────────────────────────────────────────────────────────
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('plan_name, status, start_date, renewal_date')
    .eq('gym_id', gymId)
    .maybeSingle();

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();

  // ── Aggregate counts ─────────────────────────────────────────────────────────
  const [
    { count: memberCount },
    { count: activeMemberCount },
    { count: workoutCount },
    { count: attendanceThisMonth },
    { count: postCount },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('gym_id', gymId),
    supabaseAdmin.from('memberships').select('*', { count: 'exact', head: true }).eq('gym_id', gymId).gte('end_date', today),
    supabaseAdmin.from('workouts').select('*', { count: 'exact', head: true }).eq('gym_id', gymId),
    supabaseAdmin.from('attendance').select('*', { count: 'exact', head: true }).eq('gym_id', gymId).gte('checked_in_at', monthStart),
    supabaseAdmin.from('progress_photos').select('*', { count: 'exact', head: true }).eq('gym_id', gymId),
  ]);

  // ── Trends (last 12 months) ──────────────────────────────────────────────────
  const [
    { data: attendanceRaw },
    { data: workoutsRaw },
    { data: newMembersRaw },
  ] = await Promise.all([
    supabaseAdmin.from('attendance').select('checked_in_at').eq('gym_id', gymId).gte('checked_in_at', twelveMonthsAgo),
    supabaseAdmin.from('workouts').select('date').eq('gym_id', gymId).gte('date', twelveMonthsAgo.split('T')[0]),
    supabaseAdmin.from('users').select('created_at').eq('gym_id', gymId).gte('created_at', twelveMonthsAgo),
  ]);

  // Bucket into months
  function bucketByMonth<T extends Record<string, string>>(rows: T[], dateKey: keyof T) {
    const monthLabels = lastNMonths(12);
    const counts: Record<string, number> = {};
    monthLabels.forEach((m) => { counts[m.slice(0, 7)] = 0; });
    (rows ?? []).forEach((row) => {
      const key = (row[dateKey] as string).slice(0, 7);
      if (key in counts) counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts).map(([month, count]) => ({ month, count }));
  }

  const attendanceTrend = bucketByMonth(attendanceRaw ?? [], 'checked_in_at');
  const workoutTrend    = bucketByMonth(workoutsRaw   ?? [], 'date');
  const memberGrowth    = bucketByMonth(newMembersRaw  ?? [], 'created_at');

  // ── Top users by attendance ──────────────────────────────────────────────────
  const { data: topUsersRaw } = await supabaseAdmin
    .from('attendance')
    .select('user_id, users(id, name, phone_number)')
    .eq('gym_id', gymId);

  // Aggregate attendance counts per user in JS
  const userCountMap = new Map<string, { name: string | null; phone: string; count: number }>();
  (topUsersRaw ?? []).forEach((row) => {
    const user = row.users?.[0];
    if (!user) return;
    const existing = userCountMap.get(row.user_id);
    if (existing) {
      existing.count++;
    } else {
      userCountMap.set(row.user_id, {
        name:  user.name,
        phone: user.phone_number,
        count: 1,
      });
    }
  });

  const topUsers = Array.from(userCountMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    gym,
    subscription: subscription ?? null,
    stats: {
      memberCount:          memberCount         ?? 0,
      activeMemberCount:    activeMemberCount   ?? 0,
      workoutCount:         workoutCount        ?? 0,
      attendanceThisMonth:  attendanceThisMonth ?? 0,
      postCount:            postCount           ?? 0,
    },
    trends: {
      attendance:   attendanceTrend,
      workouts:     workoutTrend,
      memberGrowth,
    },
    topUsers,
  });
}
