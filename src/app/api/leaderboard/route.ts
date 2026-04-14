import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const exerciseId = searchParams.get('exercise_id');

  // Always return ALL exercises (not just user's)
  const { data: exercises } = await supabaseAdmin
    .from('exercises')
    .select('id, name, category, muscle_group, equipment')
    .order('category')
    .order('name');

  if (!exercises) return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 });

  const targetExerciseId = exerciseId || (exercises[0]?.id ?? null);
  if (!targetExerciseId) {
    return NextResponse.json({ leaderboard: [], exercises });
  }

  const { data: prs } = await supabaseAdmin
    .from('prs')
    .select(`id, max_weight, achieved_at, users (id, phone_number, name)`)
    .eq('exercise_id', targetExerciseId)
    .order('max_weight', { ascending: false })
    .limit(20);

  const ranked = (prs || []).map((pr, idx) => ({
    ...pr,
    rank: idx + 1,
    is_current_user: (pr.users as unknown as { id: string })?.id === payload.userId,
  }));

  return NextResponse.json({ leaderboard: ranked, exercises, selected_exercise_id: targetExerciseId });
}
