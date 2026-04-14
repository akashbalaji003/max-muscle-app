import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { format } from 'date-fns';

export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const today = format(new Date(), 'yyyy-MM-dd');

  // 1. Check membership is active
  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('end_date, active')
    .eq('user_id', payload.userId)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'No membership found. Please contact the gym.' }, { status: 403 });
  }

  const endDate = new Date(membership.end_date);
  endDate.setHours(23, 59, 59, 999);
  if (!membership.active || endDate < new Date()) {
    return NextResponse.json(
      { error: 'Your membership has expired. Please renew to check in.' },
      { status: 403 }
    );
  }

  // 2. Check already checked in today
  const { data: existing } = await supabaseAdmin
    .from('attendance')
    .select('id, checked_in_at')
    .eq('user_id', payload.userId)
    .eq('date', today)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: 'Already checked in today', already_checked_in: true, checked_in_at: existing.checked_in_at },
      { status: 409 }
    );
  }

  // 3. Record attendance
  const { data, error } = await supabaseAdmin
    .from('attendance')
    .insert({ user_id: payload.userId, date: today })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to record check-in' }, { status: 500 });

  return NextResponse.json({ message: 'Check-in successful!', attendance: data });
}
