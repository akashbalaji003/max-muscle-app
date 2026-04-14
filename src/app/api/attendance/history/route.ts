import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '30');

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .select('id, date, checked_in_at')
    .eq('user_id', payload.userId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });

  return NextResponse.json({ attendance: data });
}
