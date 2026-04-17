import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

function requireSuperAdmin(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'super_admin') return null;
  return payload;
}

export async function GET(req: NextRequest) {
  if (!requireSuperAdmin(req)) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }

  // All gyms with subscription
  const { data: gyms, error } = await supabaseAdmin
    .from('gyms')
    .select('id, name, slug, address, phone, status, created_at')
    .order('created_at', { ascending: true });

  if (error || !gyms) {
    return NextResponse.json({ error: 'Failed to fetch gyms' }, { status: 500 });
  }

  const { data: subscriptions } = await supabaseAdmin
    .from('subscriptions')
    .select('gym_id, plan_name, status, renewal_date');

  const subMap = new Map((subscriptions ?? []).map((s) => [s.gym_id, s]));

  // Start of current month for attendance count
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const today = now.toISOString().split('T')[0];

  const singleGym = gyms.length === 1;

  // Per-gym aggregates — parallel fetches for each gym
  // When gym_id column isn't backfilled yet (NULL rows), fall back to counting all rows for single-gym setups
  const gymStats = await Promise.all(
    gyms.map(async (gym) => {
      const gymId = gym.id;
      // For a single-gym platform, rows with gym_id IS NULL also belong to this gym
      const gymFilter = `gym_id.eq.${gymId}${singleGym ? ',gym_id.is.null' : ''}`;

      const [
        { count: memberCount },
        { count: activeMemberCount },
        { count: workoutCount },
        { count: attendanceThisMonth },
        { count: postCount },
      ] = await Promise.all([
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).or(gymFilter),
        supabaseAdmin.from('memberships').select('*', { count: 'exact', head: true }).or(gymFilter).gte('end_date', today),
        supabaseAdmin.from('workouts').select('*', { count: 'exact', head: true }).or(gymFilter),
        supabaseAdmin.from('attendance').select('*', { count: 'exact', head: true }).or(gymFilter).gte('checked_in_at', monthStart),
        supabaseAdmin.from('progress_photos').select('*', { count: 'exact', head: true }).or(gymFilter),
      ]);

      return {
        ...gym,
        member_count:          memberCount          ?? 0,
        active_member_count:   activeMemberCount    ?? 0,
        workout_count:         workoutCount         ?? 0,
        attendance_this_month: attendanceThisMonth  ?? 0,
        post_count:            postCount            ?? 0,
        subscription:          subMap.get(gymId)   ?? null,
      };
    })
  );

  return NextResponse.json({ gyms: gymStats });
}
