import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/follow
 * Body: { following_id: string }
 *
 * - Public account  → direct follow/unfollow (existing behaviour)
 * - Private account → creates/cancels a follow_request
 *
 * Returns { following: boolean, requested: boolean, followers_count: number }
 */
export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { following_id } = await req.json();
  if (!following_id) return NextResponse.json({ error: 'following_id required' }, { status: 400 });

  const followerId = payload.userId;
  if (followerId === following_id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

  // Fetch target user's privacy setting
  const { data: target } = await supabaseAdmin
    .from('users')
    .select('id, is_private')
    .eq('id', following_id)
    .maybeSingle();

  const isPrivate = target?.is_private === true;

  // Check if already following
  const { data: existingFollow } = await supabaseAdmin
    .from('user_follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', following_id)
    .maybeSingle();

  if (existingFollow) {
    // Unfollow
    await supabaseAdmin.from('user_follows').delete().eq('id', existingFollow.id);
    await supabaseAdmin.from('activity_feed').delete()
      .match({ actor_id: followerId, recipient_id: following_id, type: 'follow' });
    const { count } = await supabaseAdmin
      .from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', following_id);
    return NextResponse.json({ following: false, requested: false, followers_count: count ?? 0 });
  }

  // ── Private account → follow request flow ────────────────────────────────
  if (isPrivate) {
    // Check for existing pending request
    const { data: existingReq } = await supabaseAdmin
      .from('follow_requests')
      .select('id')
      .eq('requester_id', followerId)
      .eq('target_id', following_id)
      .maybeSingle();

    if (existingReq) {
      // Cancel the request
      await supabaseAdmin.from('follow_requests').delete().eq('id', existingReq.id);
      const { count } = await supabaseAdmin
        .from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', following_id);
      return NextResponse.json({ following: false, requested: false, followers_count: count ?? 0 });
    }

    // Create follow request
    await supabaseAdmin.from('follow_requests').insert({
      requester_id: followerId,
      target_id: following_id,
    });

    const { count } = await supabaseAdmin
      .from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', following_id);
    return NextResponse.json({ following: false, requested: true, followers_count: count ?? 0 });
  }

  // ── Public account → direct follow ───────────────────────────────────────
  const { error: insertErr } = await supabaseAdmin.from('user_follows').insert({
    follower_id: followerId,
    following_id,
  });

  if (insertErr) {
    return NextResponse.json(
      { following: false, requested: false, followers_count: 0, error: 'Social tables not set up.' },
      { status: 503 },
    );
  }

  try {
    await supabaseAdmin.from('activity_feed').upsert(
      { recipient_id: following_id, actor_id: followerId, type: 'follow', post_id: null, read: false },
      { onConflict: 'recipient_id,actor_id,type,post_id' },
    );
  } catch { /* ignore */ }

  const { count } = await supabaseAdmin
    .from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', following_id);
  return NextResponse.json({ following: true, requested: false, followers_count: count ?? 0 });
}

/**
 * GET /api/follow?user_id=<uid>
 * Returns follow stats + whether current user has a pending request for target
 */
export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get('user_id') || payload.userId;

  const [followersRes, followingRes, amIFollowingRes, pendingReqRes] = await Promise.all([
    supabaseAdmin.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', targetId),
    supabaseAdmin.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetId),
    supabaseAdmin.from('user_follows').select('id').eq('follower_id', payload.userId).eq('following_id', targetId).maybeSingle(),
    supabaseAdmin.from('follow_requests').select('id').eq('requester_id', payload.userId).eq('target_id', targetId).maybeSingle(),
  ]);

  return NextResponse.json({
    followers_count:  followersRes.count ?? 0,
    following_count:  followingRes.count ?? 0,
    am_i_following:   !!amIFollowingRes.data,
    have_i_requested: !!pendingReqRes.data,
  });
}
