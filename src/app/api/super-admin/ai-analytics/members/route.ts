import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

function requireSuperAdmin(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'super_admin') return null;
  return payload;
}

const PAGE_SIZE = 50;

/**
 * GET /api/super-admin/ai-analytics/members
 * ?gym_id=<uuid>&page=0&plan=<plan>&min_adherence=0&max_adherence=100&search=<uuid_prefix>
 *
 * Returns paginated, anonymised member list from AI dataset.
 * NO phone_number, NO name, NO social data.
 */
export async function GET(req: NextRequest) {
  if (!requireSuperAdmin(req)) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const gymId        = searchParams.get('gym_id');
  const page         = Math.max(0, parseInt(searchParams.get('page') ?? '0'));
  const planFilter   = searchParams.get('plan') ?? '';
  const minAdherence = parseFloat(searchParams.get('min_adherence') ?? '0');
  const maxAdherence = parseFloat(searchParams.get('max_adherence') ?? '100');
  const search       = (searchParams.get('search') ?? '').toLowerCase().trim();

  if (!gymId) return NextResponse.json({ error: 'gym_id required' }, { status: 400 });

  const gymFilter = `gym_id.eq.${gymId},gym_id.is.null`;

  // 1. Fetch consented profiles for this gym
  const { data: profiles } = await supabaseAdmin
    .from('ai_member_profiles')
    .select('member_id, goal, experience_level')
    .or(gymFilter)
    .eq('consent_enabled', true);

  if (!profiles?.length) {
    return NextResponse.json({ members: [], total: 0, page });
  }

  let memberIds = profiles.map((p) => p.member_id as string);
  if (search) {
    memberIds = memberIds.filter((id) => id.toLowerCase().includes(search));
  }
  if (!memberIds.length) {
    return NextResponse.json({ members: [], total: 0, page });
  }

  // 2. Get latest weekly row per member (single query, ordered DESC)
  const { data: weeklyRows } = await supabaseAdmin
    .from('ai_weekly_training_features')
    .select('member_id, week_start, adherence_percent, assigned_plan, plan_source')
    .in('member_id', memberIds)
    .order('week_start', { ascending: false });

  // Latest row per member
  const latestMap: Record<string, { week_start: string; adherence_percent: number | null; assigned_plan: string | null; plan_source: string | null }> = {};
  for (const row of weeklyRows ?? []) {
    if (!latestMap[row.member_id]) {
      latestMap[row.member_id] = {
        week_start:       row.week_start,
        adherence_percent: row.adherence_percent,
        assigned_plan:    row.assigned_plan,
        plan_source:      row.plan_source,
      };
    }
  }

  // 3. Merge + filter
  let merged = memberIds.map((id) => {
    const latest = latestMap[id] ?? null;
    return {
      member_id:        id,
      assigned_plan:    latest?.assigned_plan    ?? null,
      plan_source:      latest?.plan_source      ?? null,
      adherence_percent: latest?.adherence_percent ?? null,
      last_active_date: latest?.week_start        ?? null,
    };
  });

  if (planFilter) {
    merged = merged.filter((r) => r.assigned_plan === planFilter);
  }

  merged = merged.filter((r) => {
    if (r.adherence_percent === null) return true;
    return r.adherence_percent >= minAdherence && r.adherence_percent <= maxAdherence;
  });

  const total = merged.length;
  const paged = merged.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return NextResponse.json({ members: paged, total, page, page_size: PAGE_SIZE });
}
