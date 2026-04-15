import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// GET — fetch all weight log entries for the logged-in user
export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '52'); // default: 1 year of weekly logs

  const { data, error } = await supabaseAdmin
    .from('weight_logs')
    .select('id, weight_kg, note, logged_at, created_at')
    .eq('user_id', payload.userId)
    .order('logged_at', { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ error: 'Failed to fetch weight logs' }, { status: 500 });

  return NextResponse.json({ logs: data || [] });
}

// POST — log a new weight entry (upserts by date — one per day)
export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await req.json();
  const { weight_kg, note, logged_at } = body;

  if (!weight_kg || isNaN(weight_kg) || weight_kg < 20 || weight_kg > 500) {
    return NextResponse.json({ error: 'Invalid weight (20–500 kg)' }, { status: 400 });
  }

  const date = logged_at || new Date().toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('weight_logs')
    .upsert(
      { user_id: payload.userId, weight_kg, note: note || null, logged_at: date },
      { onConflict: 'user_id,logged_at' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to log weight' }, { status: 500 });

  // Also update the current weight on users table
  await supabaseAdmin
    .from('users')
    .update({ weight_kg })
    .eq('id', payload.userId);

  return NextResponse.json({ log: data });
}
