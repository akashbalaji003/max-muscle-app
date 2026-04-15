import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { format } from 'date-fns';

export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { date, notes, entries, duration_seconds, workout_type } = await req.json();

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: 'At least one exercise entry is required' }, { status: 400 });
    }

    const workoutDate = date || format(new Date(), 'yyyy-MM-dd');

    // Require check-in before logging a workout
    const { data: checkin } = await supabaseAdmin
      .from('attendance')
      .select('id')
      .eq('user_id', payload.userId)
      .eq('date', workoutDate)
      .single();

    if (!checkin) {
      return NextResponse.json(
        { error: 'Please check in at the gym before logging a workout.' },
        { status: 403 }
      );
    }

    // Multiple workouts per day are allowed — no 409 restriction

    const { data: workout, error: workoutError } = await supabaseAdmin
      .from('workouts')
      .insert({
        user_id: payload.userId,
        date: workoutDate,
        notes: notes || null,
        duration_seconds: duration_seconds || 0,
        workout_type: workout_type || 'custom',
      })
      .select()
      .single();

    if (workoutError || !workout) {
      return NextResponse.json({ error: 'Failed to create workout' }, { status: 500 });
    }

    const entryRows = entries.map((e: { exercise_id: string; weight: number; reps: number; sets: number; completed?: boolean }) => ({
      workout_id: workout.id,
      exercise_id: e.exercise_id,
      weight: parseFloat(String(e.weight)),
      reps: parseInt(String(e.reps)),
      sets: parseInt(String(e.sets)),
    }));

    const { error: entriesError } = await supabaseAdmin.from('workout_entries').insert(entryRows);
    if (entriesError) return NextResponse.json({ error: 'Failed to save entries' }, { status: 500 });

    // Update PRs
    for (const entry of entryRows) {
      const { data: existingPR } = await supabaseAdmin
        .from('prs')
        .select('id, max_weight')
        .eq('user_id', payload.userId)
        .eq('exercise_id', entry.exercise_id)
        .single();

      if (!existingPR || entry.weight > existingPR.max_weight) {
        await supabaseAdmin.from('prs').upsert(
          { user_id: payload.userId, exercise_id: entry.exercise_id, max_weight: entry.weight, achieved_at: new Date().toISOString() },
          { onConflict: 'user_id,exercise_id' }
        );
      }
    }

    return NextResponse.json({ message: 'Workout logged', workout }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '20');

  const { data, error } = await supabaseAdmin
    .from('workouts')
    .select(`
      id, date, notes, created_at, duration_seconds, workout_type,
      workout_entries (
        id, weight, reps, sets,
        exercises (id, name, category, muscle_group, equipment)
      )
    `)
    .eq('user_id', payload.userId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 });

  return NextResponse.json({ workouts: data });
}
