import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/social/[postId]/like
 *
 * Toggles a like. If already liked → removes it (unlike).
 * Creates an activity_feed entry for the post author on like.
 * Returns { liked: boolean, count: number }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { postId } = await params;
  const userId = payload.userId;

  // Check if already liked
  const { data: existing, error: checkErr } = await supabaseAdmin
    .from('post_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle();

  // Table missing or DB error — return graceful response
  if (checkErr && checkErr.code !== 'PGRST116') {
    return NextResponse.json(
      { liked: false, count: 0, error: 'Social tables not set up. Run migration_005_social.sql in Supabase.' },
      { status: 503 },
    );
  }

  let liked: boolean;

  if (existing) {
    // Unlike
    await supabaseAdmin.from('post_likes').delete().eq('id', existing.id);
    // Remove activity entry
    await supabaseAdmin
      .from('activity_feed')
      .delete()
      .match({ actor_id: userId, type: 'like', post_id: postId });
    liked = false;
  } else {
    // Like
    const { error: insertErr } = await supabaseAdmin
      .from('post_likes')
      .insert({ user_id: userId, post_id: postId });

    if (insertErr) {
      return NextResponse.json(
        { liked: false, count: 0, error: 'Social tables not set up.' },
        { status: 503 },
      );
    }

    // Notify the post author (not self)
    const { data: post } = await supabaseAdmin
      .from('progress_photos')
      .select('user_id')
      .eq('id', postId)
      .maybeSingle();

    if (post && post.user_id !== userId) {
      // Non-critical — activity table may also be missing; ignore errors
      try {
        await supabaseAdmin.from('activity_feed').upsert(
          {
            recipient_id: post.user_id,
            actor_id: userId,
            type: 'like',
            post_id: postId,
            read: false,
          },
          { onConflict: 'recipient_id,actor_id,type,post_id' },
        );
      } catch { /* ignore */ }
    }
    liked = true;
  }

  // Return updated count
  const { count } = await supabaseAdmin
    .from('post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  return NextResponse.json({ liked, count: count ?? 0 });
}
