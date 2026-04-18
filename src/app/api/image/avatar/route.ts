import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/image/avatar
 * Proxies the current user's avatar from Supabase Storage using the
 * service-role key, so the bucket can stay private and images load
 * correctly on all devices without CORS or auth issues.
 */
export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Fetch the stored avatar_url from the DB
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('avatar_url')
    .eq('id', payload.userId)
    .single();

  if (!user?.avatar_url) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Extract the storage path from the full URL
  // e.g. https://xxx.supabase.co/storage/v1/object/public/progress-photos/avatars/userId.png?v=...
  const url = new URL(user.avatar_url);
  const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/(.+)/);
  if (!pathMatch) {
    return new NextResponse('Invalid URL', { status: 400 });
  }

  const [bucket, ...rest] = pathMatch[1].split('/');
  const objectPath = rest.join('/');

  // Download using service-role key (bypasses RLS / private bucket)
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .download(objectPath);

  if (error || !data) {
    return new NextResponse('Image not found', { status: 404 });
  }

  const buffer = await data.arrayBuffer();
  const contentType = data.type || 'image/jpeg';

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=86400', // cache 24h on device
    },
  });
}
