import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const { data: photo } = await supabaseAdmin
    .from('progress_photos')
    .select('id, user_id')
    .eq('id', id)
    .single();

  if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  if (photo.user_id !== payload.userId) {
    return NextResponse.json({ error: 'Not authorized to delete this photo' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('progress_photos')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });

  return NextResponse.json({ message: 'Photo deleted' });
}
