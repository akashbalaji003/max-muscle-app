import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET  /api/social/[postId]/comments  — list comments for a post
 * POST /api/social/[postId]/comments  — add a new comment
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { postId } = await params;

  const { data, error } = await supabaseAdmin
    .from('post_comments')
    .select('id, body, created_at, user_id, users(id, name, phone_number, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    // Table missing — return empty rather than 500 so the sheet still opens
    return NextResponse.json({ comments: [], setup_required: true });
  }

  return NextResponse.json({ comments: data ?? [] });
}

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

  const { body } = await req.json();
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
  }
  if (body.trim().length > 500) {
    return NextResponse.json({ error: 'Comment too long (max 500 chars)' }, { status: 400 });
  }

  // Insert comment
  const { data: comment, error } = await supabaseAdmin
    .from('post_comments')
    .insert({ user_id: userId, post_id: postId, body: body.trim() })
    .select('id, body, created_at, user_id, users(id, name, phone_number, avatar_url)')
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Social tables not set up. Run migration_005_social.sql in Supabase SQL Editor.' },
      { status: 503 },
    );
  }

  // Notify post author (not self)
  const { data: post } = await supabaseAdmin
    .from('progress_photos')
    .select('user_id')
    .eq('id', postId)
    .maybeSingle();

  if (post && post.user_id !== userId) {
    await supabaseAdmin.from('activity_feed').insert({
      recipient_id: post.user_id,
      actor_id: userId,
      type: 'comment',
      post_id: postId,
      comment_id: comment.id,
      meta: { body: body.trim().slice(0, 80) },
      read: false,
    });
  }

  return NextResponse.json({ comment }, { status: 201 });
}
