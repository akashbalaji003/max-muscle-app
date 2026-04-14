import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('prs')
    .select(`
      id, max_weight, achieved_at,
      exercises (id, name, category)
    `)
    .eq('user_id', payload.userId)
    .order('achieved_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Failed to fetch PRs' }, { status: 500 });

  return NextResponse.json({ prs: data });
}
