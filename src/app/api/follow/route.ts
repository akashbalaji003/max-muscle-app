import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/follow
 * Body: { following_id: string }
 *
 * Toggles follow/unfollow. Creates activity notification on follow.
 * Returns { following: boolean, followers_count: number }
 */
export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { following_id } = await req.json();
  if (!following_id) {
    return NextResponse.json({ error: 'following_id required' }, { status: 400 });
  }

  const followerId = payload.userId;

  if (followerId === following_id) {
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
  }

  // Check current follow state
  const { data: existing, error: checkErr } = await supabaseAdmin
    .from('user_follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', following_id)
    .maybeSingle();

  // Table missing — return graceful error so UI can revert optimistic update
  if (checkErr && checkErr.code !== 'PGRST116') {
    return NextResponse.json(
      { following: false, followers_count: 0, error: 'Social tables not set up. Run migration_005_social.sql in Supabase.' },
      { status: 503 },
    );
  }

  let following: boolean;

  if (existing) {
    // Unfollow
    await supabaseAdmin.from('user_follows').delete().eq('id', existing.id);
    await supabaseAdmin
      .from('activity_feed')
      .delete()
      .match({ actor_id: followerId, recipient_id: following_id, type: 'follow' });
    following = false;
  } else {
    // Follow
    const { error: insertErr } = await supabaseAdmin.from('user_follows').insert({
      follower_id: followerId,
      following_id,
    });

    if (insertErr) {
      return NextResponse.json(
        { following: false, followers_count: 0, error: 'Social tables not set up.' },
        { status: 503 },
      );
    }

    // Notify the followed user (non-critical — activity table may also be missing)
    try {
      await supabaseAdmin.from('activity_feed').upsert(
        {
          recipient_id: following_id,
          actor_id: followerId,
          type: 'follow',
          post_id: null,
          read: false,
        },
        { onConflict: 'recipient_id,actor_id,type,post_id' },
      );
    } catch { /* ignore */ }
    following = true;
  }

  // Return updated followers count
  const { count } = await supabaseAdmin
    .from('user_follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', following_id);

  return NextResponse.json({ following, followers_count: count ?? 0 });
}

/**
 * GET /api/follow?user_id=<uid>
 * Returns follow stats for a given user
 */
export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get('user_id') || payload.userId;

  const [followersRes, followingRes, amIFollowingRes] = await Promise.all([
    supabaseAdmin.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', targetId),
    supabaseAdmin.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetId),
    supabaseAdmin.from('user_follows').select('id').eq('follower_id', payload.userId).eq('following_id', targetId).maybeSingle(),
  ]);

  return NextResponse.json({
    followers_count: followersRes.count ?? 0,
    following_count: followingRes.count ?? 0,
    am_i_following:  !!amIFollowingRes.data,
  });
}
