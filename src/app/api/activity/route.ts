import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/activity
 * Returns:
 *   activity      — activity_feed items (likes, comments, follows)
 *   followRequests — pending follow_requests targeting the current user
 *   unread        — count of unread activity items + pending requests
 *
 * POST /api/activity — mark all activity_feed items as read
 */
export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [activityRes, requestsRes] = await Promise.all([
    supabaseAdmin
      .from('activity_feed')
      .select(`
        id, type, read, created_at, meta,
        actor:actor_id ( id, name, phone_number, avatar_url ),
        post:post_id ( id, image_url )
      `)
      .eq('recipient_id', payload.userId)
      .order('created_at', { ascending: false })
      .limit(40),

    supabaseAdmin
      .from('follow_requests')
      .select(`
        id, requester_id, created_at,
        requester:requester_id ( id, name, phone_number, avatar_url )
      `)
      .eq('target_id', payload.userId)
      .order('created_at', { ascending: false }),
  ]);

  const activity       = activityRes.data ?? [];
  const followRequests = requestsRes.data ?? [];
  const unread = activity.filter((a) => !a.read).length + followRequests.length;

  return NextResponse.json({ activity, followRequests, unread });
}

export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await supabaseAdmin
    .from('activity_feed')
    .update({ read: true })
    .eq('recipient_id', payload.userId)
    .eq('read', false);

  return NextResponse.json({ ok: true });
}
