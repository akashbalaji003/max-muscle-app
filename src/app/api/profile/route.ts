import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

function calcBMI(weightKg: number, heightCm: number): number {
  const hm = heightCm / 100;
  return Math.round((weightKg / (hm * hm)) * 10) / 10;
}

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

// GET — full user profile (name + body metrics + computed BMI)
export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', payload.userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const bmi =
    data.height_cm && data.weight_kg
      ? calcBMI(data.weight_kg as number, data.height_cm as number)
      : null;

  return NextResponse.json({
    id: data.id,
    name: data.name ?? null,
    phone_number: data.phone_number,
    height_cm: data.height_cm ?? null,
    weight_kg: data.weight_kg ?? null,
    goal: data.goal ?? null,
    bmi,
    bmiCategory: bmi ? bmiCategory(bmi) : null,
    created_at: data.created_at,
    account_visibility: data.account_visibility ?? 'public',
    is_private: data.is_private ?? false,
    assigned_plan: data.assigned_plan ?? null,
    plan_source: data.plan_source ?? 'system',
    custom_plan: data.custom_plan ?? null,
  });
}

// POST — update profile fields (name, height_cm, weight_kg, goal)
export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await req.json();
  const { name, height_cm, weight_kg, goal, account_visibility, is_private } = body;

  // Validate
  if (name !== undefined && typeof name !== 'string') {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  }
  if (height_cm !== undefined && (isNaN(Number(height_cm)) || Number(height_cm) < 50 || Number(height_cm) > 300)) {
    return NextResponse.json({ error: 'Invalid height (50–300 cm)' }, { status: 400 });
  }
  if (weight_kg !== undefined && (isNaN(Number(weight_kg)) || Number(weight_kg) < 20 || Number(weight_kg) > 500)) {
    return NextResponse.json({ error: 'Invalid weight (20–500 kg)' }, { status: 400 });
  }
  if (goal !== undefined && !['fat_loss', 'muscle_gain', 'maintenance'].includes(goal)) {
    return NextResponse.json({ error: 'Invalid goal' }, { status: 400 });
  }
  if (account_visibility !== undefined && !['public', 'private'].includes(account_visibility)) {
    return NextResponse.json({ error: 'Invalid account_visibility' }, { status: 400 });
  }
  if (is_private !== undefined && typeof is_private !== 'boolean') {
    return NextResponse.json({ error: 'Invalid is_private' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim() || null;
  if (height_cm !== undefined) updates.height_cm = Number(height_cm);
  if (weight_kg !== undefined) updates.weight_kg = Number(weight_kg);
  if (goal !== undefined) updates.goal = goal;
  if (account_visibility !== undefined) updates.account_visibility = account_visibility;
  if (is_private !== undefined) updates.is_private = Boolean(is_private);

  const { error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', payload.userId);

  if (error) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });

  // Sync weight log if weight was updated
  if (weight_kg !== undefined) {
    const today = new Date().toISOString().split('T')[0];
    await supabaseAdmin.from('weight_logs').upsert(
      { user_id: payload.userId, weight_kg: Number(weight_kg), logged_at: today },
      { onConflict: 'user_id,logged_at' }
    );
  }

  return NextResponse.json({ message: 'Profile updated' });
}
