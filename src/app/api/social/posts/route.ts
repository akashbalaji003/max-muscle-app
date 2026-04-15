import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/social/posts?filter=all|following&cursor=<created_at>
 *
 * Returns progress_photos augmented with:
 *   like_count, comment_count, liked_by_me, is_following_author
 *   author avatar_url
 */
export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter') || 'all';      // 'all' | 'following'
  const userId = payload.userId;

  // ── 1. Resolve following IDs if filter = 'following' ─────────────────────
  let followingIds: string[] = [];
  if (filter === 'following') {
    const { data: follows } = await supabaseAdmin
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId);
    followingIds = (follows ?? []).map((f) => f.following_id);
    followingIds.push(userId); // always include own posts
  }

  // ── 2. Fetch posts ────────────────────────────────────────────────────────
  let query = supabaseAdmin
    .from('progress_photos')
    .select('id, image_url, date, is_weekly, caption, note, created_at, user_id, users(id, name, phone_number, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (filter === 'following' && followingIds.length > 0) {
    query = query.in('user_id', followingIds);
  } else if (filter === 'following' && followingIds.length === 0) {
    // Following nobody (except self) — return empty
    return NextResponse.json({ posts: [] });
  }

  const { data: posts, error } = await query;
  if (error || !posts?.length) {
    return NextResponse.json({ posts: [] });
  }

  const postIds  = posts.map((p) => p.id);
  const authorIds = [...new Set(posts.map((p) => p.user_id))];

  // ── 3. Batch fetch social data ────────────────────────────────────────────
  const [likesRes, commentsRes, myLikesRes, myFollowsRes] = await Promise.all([
    // All likes on these posts (for counts)
    supabaseAdmin.from('post_likes').select('post_id').in('post_id', postIds),
    // All comments on these posts (for counts)
    supabaseAdmin.from('post_comments').select('post_id').in('post_id', postIds),
    // Which posts the current user has liked
    supabaseAdmin.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
    // Which of these authors the current user follows
    supabaseAdmin.from('user_follows').select('following_id').eq('follower_id', userId).in('following_id', authorIds),
  ]);

  // Build lookup maps
  const likeCounts: Record<string, number>    = {};
  const commentCounts: Record<string, number> = {};
  const likedPostIds   = new Set((myLikesRes.data  ?? []).map((l) => l.post_id));
  const followedAuthorIds = new Set((myFollowsRes.data ?? []).map((f) => f.following_id));

  for (const l of likesRes.data   ?? []) likeCounts[l.post_id]   = (likeCounts[l.post_id]   || 0) + 1;
  for (const c of commentsRes.data ?? []) commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;

  // ── 4. Augment and return ─────────────────────────────────────────────────
  const augmented = posts.map((p) => ({
    ...p,
    like_count:          likeCounts[p.id]          || 0,
    comment_count:       commentCounts[p.id]       || 0,
    liked_by_me:         likedPostIds.has(p.id),
    is_following_author: followedAuthorIds.has(p.user_id),
  }));

  return NextResponse.json({ posts: augmented });
}
