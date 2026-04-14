import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, phone_number, name, avatar_url, created_at')
    .eq('id', payload.userId)
    .single();

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Fetch membership
  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('*')
    .eq('user_id', payload.userId)
    .single();

  return NextResponse.json({ user, membership: membership || null });
}
