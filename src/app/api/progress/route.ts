import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { format } from 'date-fns';

export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { image_url, is_weekly, caption, note, date } = await req.json();

    if (!image_url) {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 });
    }

    const photoDate = date || format(new Date(), 'yyyy-MM-dd');
    const captionText = caption || note || null;

    const { data, error } = await supabaseAdmin
      .from('progress_photos')
      .insert({
        user_id: payload.userId,
        image_url,
        date: photoDate,
        is_weekly: is_weekly || false,
        caption: captionText,
        note: captionText,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 });

    return NextResponse.json({ message: 'Photo saved', photo: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/progress — social feed: all users' posts, newest first
export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const mine = searchParams.get('mine') === 'true';

  let query = supabaseAdmin
    .from('progress_photos')
    .select(`
      id, image_url, date, is_weekly, caption, note, created_at,
      users (id, phone_number, name)
    `)
    .order('created_at', { ascending: false })
    .limit(60);

  if (mine) query = query.eq('user_id', payload.userId);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });

  return NextResponse.json({ photos: data });
}
