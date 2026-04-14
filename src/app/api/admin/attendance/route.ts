import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date'); // optional filter by date

  let query = supabaseAdmin
    .from('attendance')
    .select(`
      id, date, checked_in_at,
      users (id, phone_number, name)
    `)
    .order('checked_in_at', { ascending: false });

  if (date) query = query.eq('date', date);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });

  return NextResponse.json({ attendance: data });
}
