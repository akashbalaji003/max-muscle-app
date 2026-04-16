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

  const today = new Date().toISOString().split('T')[0];

  const [
    { count: totalGyms },
    { count: totalMembers },
    { count: activeMembers },
    { count: totalWorkouts },
    { count: totalAttendance },
    { count: totalPosts },   // progress_photos is the posts table
    { count: totalLikes },
    { count: totalComments },
  ] = await Promise.all([
    supabaseAdmin.from('gyms').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('memberships').select('*', { count: 'exact', head: true }).gte('end_date', today),
    supabaseAdmin.from('workouts').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('attendance').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('progress_photos').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('post_likes').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('post_comments').select('*', { count: 'exact', head: true }),
  ]);

  return NextResponse.json({
    totalGyms:      totalGyms      ?? 0,
    totalMembers:   totalMembers   ?? 0,
    activeMembers:  activeMembers  ?? 0,
    totalWorkouts:  totalWorkouts  ?? 0,
    totalAttendance: totalAttendance ?? 0,
    totalPosts:     totalPosts     ?? 0,
    totalLikes:     totalLikes     ?? 0,
    totalComments:  totalComments  ?? 0,
  });
}
