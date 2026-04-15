import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/activity
 * Returns the current user's activity feed (notifications).
 * Ordered newest-first, limit 40.
 *
 * POST /api/activity/read  — mark all as read (called on tab open)
 */
export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('activity_feed')
    .select(`
      id, type, read, created_at, meta,
      actor:actor_id ( id, name, phone_number, avatar_url ),
      post:post_id ( id, image_url )
    `)
    .eq('recipient_id', payload.userId)
    .order('created_at', { ascending: false })
    .limit(40);

  if (error) return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 });

  // Count unread
  const unread = (data ?? []).filter((a) => !a.read).length;

  return NextResponse.json({ activity: data ?? [], unread });
}

export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Mark all as read
  await supabaseAdmin
    .from('activity_feed')
    .update({ read: true })
    .eq('recipient_id', payload.userId)
    .eq('read', false);

  return NextResponse.json({ ok: true });
}
