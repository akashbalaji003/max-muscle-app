import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * PATCH /api/follow-requests/[id]
 * Body: { action: 'accept' | 'decline' }
 *
 * Only callable by the TARGET of the request (the private account owner).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: requestId } = await params;
  const { action } = await req.json();

  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 });
  }

  // Load the request — verify it belongs to this user (as target)
  const { data: fr } = await supabaseAdmin
    .from('follow_requests')
    .select('id, requester_id, target_id')
    .eq('id', requestId)
    .eq('target_id', payload.userId)   // security: only target can act
    .maybeSingle();

  if (!fr) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  if (action === 'accept') {
    // Create follow relationship
    await supabaseAdmin.from('user_follows').upsert(
      { follower_id: fr.requester_id, following_id: fr.target_id },
      { onConflict: 'follower_id,following_id' },
    );

    // Notify requester that their request was accepted
    try {
      await supabaseAdmin.from('activity_feed').upsert(
        {
          recipient_id: fr.requester_id,
          actor_id:     fr.target_id,
          type:         'follow',
          post_id:      null,
          read:         false,
        },
        { onConflict: 'recipient_id,actor_id,type,post_id' },
      );
    } catch { /* ignore */ }
  }

  // Delete the request regardless of accept/decline
  await supabaseAdmin.from('follow_requests').delete().eq('id', requestId);

  return NextResponse.json({ ok: true, action });
}
