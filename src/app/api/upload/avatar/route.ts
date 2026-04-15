import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/upload/avatar
 * Uploads a profile picture to Supabase Storage and updates users.avatar_url.
 */
export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP allowed' }, { status: 400 });
    }
    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json({ error: 'Max file size is 3 MB' }, { status: 400 });
    }

    const ext      = file.type.split('/')[1];
    const filename = `avatars/${payload.userId}.${ext}`;
    const buffer   = Buffer.from(await file.arrayBuffer());

    // Upsert (overwrite previous avatar)
    const { error: uploadError } = await supabaseAdmin.storage
      .from('progress-photos')
      .upload(filename, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('progress-photos')
      .getPublicUrl(filename);

    // Bust cache by appending a timestamp query param
    const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    // Save to DB
    await supabaseAdmin
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', payload.userId);

    return NextResponse.json({ avatar_url: avatarUrl });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
