import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// ── Auth guard ────────────────────────────────────────────────────────────────
function requireSuperAdmin(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'super_admin') return null;
  return payload;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns ISO Monday date string (YYYY-MM-DD) for any date string */
function isoWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Epley estimated 1-rep max */
function epley1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/** Expected weekly sessions per plan type */
function expectedSessions(plan: string | null): number {
  switch (plan) {
    case 'push_pull_legs': return 6;
    case 'upper_lower':    return 4;
    case 'full_body':      return 3;
    case 'custom':         return 3;
    default:               return 3;
  }
}

/** Chunk array into batches */
function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ExerciseAgg {
  weights: number[];
  reps:    number[];
  sets:    number[];
}

interface WeekBucket {
  workoutIds:    Set<string>;
  exercises:     Map<string, ExerciseAgg>;
  attendanceCount: number;
}

// ── POST /api/ai/sync-weekly ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!requireSuperAdmin(req)) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const gymIdFilter = searchParams.get('gym_id') ?? null;
  const testLimit   = Math.max(0, parseInt(searchParams.get('limit') ?? '0') || 0);

  // ── STEP 1: consented member profiles ──────────────────────────────────────
  let profileQ = supabaseAdmin
    .from('ai_member_profiles')
    .select('member_id, gym_id, consent_enabled')
    .eq('consent_enabled', true);

  if (gymIdFilter) profileQ = profileQ.eq('gym_id', gymIdFilter);

  const { data: profiles, error: profileErr } = await profileQ;
  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }
  if (!profiles?.length) {
    return NextResponse.json({ synced_members: 0, message: 'No consented members found' });
  }

  // Apply test-mode cap
  const profilesSlice = testLimit > 0 ? profiles.slice(0, testLimit) : profiles;
  const memberIds     = profilesSlice.map((p) => p.member_id as string);

  // member_id → gym_id lookup
  const memberGymMap: Record<string, string | null> = {};
  for (const p of profilesSlice) memberGymMap[p.member_id as string] = (p.gym_id as string) ?? null;

  // ── STEP 2: user plan data (id only — no PII) ──────────────────────────────
  const userPlanMap: Record<string, { assigned_plan: string | null; plan_source: string | null }> = {};
  for (const batch of chunks(memberIds, 500)) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, assigned_plan, plan_source')
      .in('id', batch);
    for (const u of data ?? []) {
      userPlanMap[u.id as string] = {
        assigned_plan: (u.assigned_plan as string) ?? null,
        plan_source:   (u.plan_source   as string) ?? 'system',
      };
    }
  }

  // ── STEP 3: workouts (bulk, no PII columns) ────────────────────────────────
  const allWorkouts: { id: string; user_id: string; date: string }[] = [];
  for (const batch of chunks(memberIds, 500)) {
    const { data } = await supabaseAdmin
      .from('workouts')
      .select('id, user_id, date')
      .in('user_id', batch)
      .order('date', { ascending: true });
    for (const w of data ?? []) allWorkouts.push(w as { id: string; user_id: string; date: string });
  }

  if (!allWorkouts.length) {
    return NextResponse.json({ synced_members: memberIds.length, message: 'No workout data found' });
  }

  // workout_id → { userId, week }
  const workoutMeta: Record<string, { userId: string; week: string }> = {};
  const workoutIds: string[] = [];
  for (const w of allWorkouts) {
    workoutMeta[w.id] = { userId: w.user_id, week: isoWeekStart(w.date) };
    workoutIds.push(w.id);
  }

  // ── STEP 4: workout entries (chunked) ──────────────────────────────────────
  const allEntries: { workout_id: string; exercise_id: string; weight: number; reps: number; sets: number }[] = [];
  for (const batch of chunks(workoutIds, 500)) {
    const { data } = await supabaseAdmin
      .from('workout_entries')
      .select('workout_id, exercise_id, weight, reps, sets')
      .in('workout_id', batch);
    for (const e of data ?? []) {
      allEntries.push({
        workout_id:  e.workout_id  as string,
        exercise_id: e.exercise_id as string,
        weight:      Number(e.weight),
        reps:        Number(e.reps),
        sets:        Number(e.sets),
      });
    }
  }

  // ── STEP 5: exercise catalogue (name + category) ───────────────────────────
  const { data: exerciseCatalogue } = await supabaseAdmin
    .from('exercises')
    .select('id, name, category');

  const exerciseMeta: Record<string, { name: string; category: string }> = {};
  for (const ex of exerciseCatalogue ?? []) {
    exerciseMeta[ex.id as string] = { name: ex.name as string, category: ex.category as string };
  }

  // ── STEP 6: attendance (chunked) ───────────────────────────────────────────
  const allAttendance: { user_id: string; date: string }[] = [];
  for (const batch of chunks(memberIds, 500)) {
    const { data } = await supabaseAdmin
      .from('attendance')
      .select('user_id, date')
      .in('user_id', batch);
    for (const a of data ?? []) {
      allAttendance.push({ user_id: a.user_id as string, date: a.date as string });
    }
  }

  // ── STEP 7: build member × week buckets ───────────────────────────────────
  const memberWeeks: Record<string, Record<string, WeekBucket>> = {};
  for (const id of memberIds) memberWeeks[id] = {};

  // Workouts → week buckets
  for (const w of allWorkouts) {
    const week = workoutMeta[w.id].week;
    if (!memberWeeks[w.user_id]) continue;
    if (!memberWeeks[w.user_id][week]) {
      memberWeeks[w.user_id][week] = { workoutIds: new Set(), exercises: new Map(), attendanceCount: 0 };
    }
    memberWeeks[w.user_id][week].workoutIds.add(w.id);
  }

  // Entries → exercise buckets
  for (const e of allEntries) {
    const meta = workoutMeta[e.workout_id];
    if (!meta) continue;
    const bucket = memberWeeks[meta.userId]?.[meta.week];
    if (!bucket) continue;
    if (!bucket.exercises.has(e.exercise_id)) {
      bucket.exercises.set(e.exercise_id, { weights: [], reps: [], sets: [] });
    }
    const agg = bucket.exercises.get(e.exercise_id)!;
    agg.weights.push(e.weight);
    agg.reps.push(e.reps);
    agg.sets.push(e.sets);
  }

  // Attendance → week buckets
  for (const a of allAttendance) {
    const week   = isoWeekStart(a.date);
    const bucket = memberWeeks[a.user_id]?.[week];
    if (bucket) bucket.attendanceCount++;
  }

  // ── STEP 8: aggregate into row arrays ─────────────────────────────────────
  const weeklyRows:   Record<string, unknown>[] = [];
  const exerciseRows: Record<string, unknown>[] = [];

  for (const userId of memberIds) {
    const gymId    = memberGymMap[userId] ?? null;
    const planInfo = userPlanMap[userId] ?? { assigned_plan: null, plan_source: 'system' };
    const weeks    = Object.keys(memberWeeks[userId]).sort();

    // Track previous week's top weight per exercise for delta + progression
    const prevTopWeight: Record<string, number> = {};

    for (const week of weeks) {
      const bucket = memberWeeks[userId][week];
      const sessionsCompleted = bucket.workoutIds.size;
      const expected          = expectedSessions(planInfo.assigned_plan);
      const adherencePct      = Math.min(100, Math.round((sessionsCompleted / expected) * 10000) / 100);

      let weeklyVolume = 0;
      let totalSets    = 0;
      const exUsageCount:   Record<string, number> = {};  // exId → total sets
      const muscleGroupDist: Record<string, number> = {};
      const progressionScores: number[] = [];

      for (const [exId, agg] of bucket.exercises.entries()) {
        const info = exerciseMeta[exId];
        if (!info) continue;

        const setCount = agg.sets.reduce((a, b) => a + b, 0);
        exUsageCount[exId]           = (exUsageCount[exId]           ?? 0) + setCount;
        muscleGroupDist[info.category] = (muscleGroupDist[info.category] ?? 0) + setCount;
        totalSets += setCount;

        // Volume
        for (let i = 0; i < agg.weights.length; i++) {
          weeklyVolume += agg.weights[i] * agg.reps[i] * agg.sets[i];
        }

        // Top weight + estimated 1RM
        const topWeight = Math.max(...agg.weights);
        const topIdx    = agg.weights.indexOf(topWeight);
        const topReps   = agg.reps[topIdx] ?? 1;
        const e1rm      = topReps > 0 ? epley1RM(topWeight, topReps) : null;
        const totalVol  = agg.weights.reduce((s, w, i) => s + w * agg.reps[i] * agg.sets[i], 0);
        const delta     = topWeight - (prevTopWeight[exId] ?? topWeight);

        exerciseRows.push({
          member_id:     userId,
          gym_id:        gymId,
          exercise_name: info.name,
          week_start:    week,
          top_weight:    Math.round(topWeight * 100) / 100,
          total_volume:  Math.round(totalVol  * 100) / 100,
          estimated_1rm: e1rm,
          progress_delta: Math.round(delta   * 100) / 100,
        });

        // Progression score: % weight change vs previous week
        const prev = prevTopWeight[exId];
        if (prev !== undefined && prev > 0) {
          progressionScores.push(((topWeight - prev) / prev) * 100);
        }
        prevTopWeight[exId] = topWeight;
      }

      // Top 5 exercises by total sets
      const topExercises = Object.entries(exUsageCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([exId]) => exerciseMeta[exId]?.name ?? exId);

      const avgProgressionScore =
        progressionScores.length > 0
          ? Math.round((progressionScores.reduce((a, b) => a + b, 0) / progressionScores.length) * 100) / 100
          : 0;

      // Estimate weekly minutes: each set ≈ 4.5 min (work + rest)
      const weeklyMinutes = Math.round(totalSets * 4.5);

      weeklyRows.push({
        member_id:                userId,
        gym_id:                   gymId,
        week_start:               week,
        sessions_completed:       sessionsCompleted,
        weekly_minutes:           weeklyMinutes,
        weekly_volume:            Math.round(weeklyVolume * 100) / 100,
        adherence_percent:        adherencePct,
        top_exercises:            topExercises,
        muscle_group_distribution: muscleGroupDist,
        avg_progression_score:    avgProgressionScore,
        attendance_count:         bucket.attendanceCount,
        assigned_plan:            planInfo.assigned_plan,
        plan_source:              planInfo.plan_source,
      });
    }
  }

  // ── STEP 9: upsert ai_weekly_training_features ────────────────────────────
  const BATCH_SIZE = 500;
  let weeklyUpserted  = 0;
  let weeklyErrors    = 0;

  for (const batch of chunks(weeklyRows, BATCH_SIZE)) {
    const { error } = await supabaseAdmin
      .from('ai_weekly_training_features')
      .upsert(batch, { onConflict: 'member_id,week_start' });
    if (error) weeklyErrors += batch.length;
    else       weeklyUpserted += batch.length;
  }

  // ── STEP 10: upsert ai_exercise_progress ──────────────────────────────────
  let exerciseUpserted = 0;
  let exerciseErrors   = 0;

  for (const batch of chunks(exerciseRows, BATCH_SIZE)) {
    const { error } = await supabaseAdmin
      .from('ai_exercise_progress')
      .upsert(batch, { onConflict: 'member_id,exercise_name,week_start' });
    if (error) exerciseErrors += batch.length;
    else       exerciseUpserted += batch.length;
  }

  // ── STEP 11: ensure ai_member_profiles are up-to-date ─────────────────────
  // Profiles are created on consent — here we just refresh gym_id + updated_at
  const profileRefreshRows = profilesSlice.map((p) => ({
    member_id:       p.member_id,
    gym_id:          p.gym_id ?? null,
    consent_enabled: true,
    updated_at:      new Date().toISOString(),
  }));

  let profilesUpdated = 0;
  for (const batch of chunks(profileRefreshRows, BATCH_SIZE)) {
    const { error } = await supabaseAdmin
      .from('ai_member_profiles')
      .upsert(batch, { onConflict: 'member_id' });
    if (!error) profilesUpdated += batch.length;
  }

  // ── Response ───────────────────────────────────────────────────────────────
  return NextResponse.json({
    ok:                    true,
    test_mode:             testLimit > 0,
    limit_applied:         testLimit > 0 ? testLimit : null,
    synced_members:        memberIds.length,
    profiles_refreshed:    profilesUpdated,
    weekly_rows_upserted:  weeklyUpserted,
    weekly_rows_errors:    weeklyErrors,
    exercise_rows_upserted: exerciseUpserted,
    exercise_rows_errors:  exerciseErrors,
    totals: {
      workouts:             allWorkouts.length,
      entries:              allEntries.length,
      weeks_processed:      weeklyRows.length,
      exercise_data_points: exerciseRows.length,
    },
  });
}
