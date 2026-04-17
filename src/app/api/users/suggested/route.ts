import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/users/suggested
 *
 * Returns up to 8 gym members the current user is NOT yet following,
 * ordered by join date (newest first — "fresh faces").
 */
export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = payload.userId;

  // IDs the current user already follows
  const { data: follows } = await supabaseAdmin
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', userId);

  const alreadyFollowing = new Set(
    (follows ?? []).map((f) => f.following_id),
  );
  alreadyFollowing.add(userId); // exclude self

  // Public-only members — no phone numbers returned
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, name, avatar_url, created_at')
    .eq('account_visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(50);

  const suggestions = (users ?? [])
    .filter((u) => !alreadyFollowing.has(u.id))
    .slice(0, 8);

  return NextResponse.json({ users: suggestions });
}
