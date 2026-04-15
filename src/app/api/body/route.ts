import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// GET — return current body metrics for the logged-in user
export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('height_cm, weight_kg, goal')
    .eq('id', payload.userId)
    .single();

  if (error) return NextResponse.json({ error: 'Failed to fetch body metrics' }, { status: 500 });

  return NextResponse.json({
    height_cm: data.height_cm ?? null,
    weight_kg: data.weight_kg ?? null,
    goal: data.goal ?? null,
  });
}

// POST — update body metrics (height, weight, goal)
export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await req.json();
  const { height_cm, weight_kg, goal } = body;

  if (height_cm !== undefined && (isNaN(height_cm) || height_cm < 50 || height_cm > 300)) {
    return NextResponse.json({ error: 'Invalid height (50–300 cm)' }, { status: 400 });
  }
  if (weight_kg !== undefined && (isNaN(weight_kg) || weight_kg < 20 || weight_kg > 500)) {
    return NextResponse.json({ error: 'Invalid weight (20–500 kg)' }, { status: 400 });
  }
  if (goal !== undefined && !['fat_loss', 'muscle_gain', 'maintenance'].includes(goal)) {
    return NextResponse.json({ error: 'Invalid goal' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (height_cm !== undefined) updates.height_cm = height_cm;
  if (weight_kg !== undefined) updates.weight_kg = weight_kg;
  if (goal !== undefined) updates.goal = goal;

  const { error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', payload.userId);

  if (error) return NextResponse.json({ error: 'Failed to update body metrics' }, { status: 500 });

  // Also create a weight log entry if weight was updated
  if (weight_kg !== undefined) {
    const today = new Date().toISOString().split('T')[0];
    await supabaseAdmin.from('weight_logs').upsert(
      { user_id: payload.userId, weight_kg, logged_at: today },
      { onConflict: 'user_id,logged_at' }
    );
  }

  return NextResponse.json({ message: 'Body metrics updated' });
}
