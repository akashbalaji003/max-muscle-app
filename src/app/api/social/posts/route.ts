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

  // ── 1. Always resolve which users the viewer follows ────────────────────
  const { data: follows } = await supabaseAdmin
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', userId);
  const followingSet = new Set((follows ?? []).map((f) => f.following_id));
  followingSet.add(userId); // always include own content

  const followingIds = [...followingSet];

  // ── 2. Fetch posts ───────────────────────────────────────────────────────
  let query = supabaseAdmin
    .from('progress_photos')
    .select('id, image_url, date, is_weekly, caption, note, created_at, user_id, users!inner(id, name, avatar_url, account_visibility, is_private)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (filter === 'following') {
    if (followingIds.length === 0) return NextResponse.json({ posts: [] });
    query = query.in('user_id', followingIds);
  }

  const { data: rawPosts, error } = await query;
  if (error || !rawPosts?.length) {
    return NextResponse.json({ posts: [] });
  }

  // ── 3. Privacy filter ─────────────────────────────────────────────────────
  // Show post if:  own post  OR  public account  OR  viewer follows the author
  const posts = rawPosts.filter((p) => {
    if (p.user_id === userId) return true;
    if (followingSet.has(p.user_id)) return true; // accepted follower sees private posts
    const author = p.users as unknown as { account_visibility?: string; is_private?: boolean } | null;
    if (!author) return true;
    if (author.is_private === true) return false;
    if (author.account_visibility === 'private') return false;
    return true;
  });

  const postIds = posts.map((p) => p.id);

  // ── 4. Batch fetch social data ────────────────────────────────────────────
  const [likesRes, commentsRes, myLikesRes] = await Promise.all([
    supabaseAdmin.from('post_likes').select('post_id').in('post_id', postIds),
    supabaseAdmin.from('post_comments').select('post_id').in('post_id', postIds),
    supabaseAdmin.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
  ]);

  // Build lookup maps
  const likeCounts: Record<string, number>    = {};
  const commentCounts: Record<string, number> = {};
  const likedPostIds = new Set((myLikesRes.data ?? []).map((l) => l.post_id));
  // followingSet already built above — reuse it
  const followedAuthorIds = followingSet;

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
