import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

function requireAdmin(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  // ── Step 1: Fetch users (try with banned, fall back without) ──
  let usersData: {
    id: string; phone_number: string; name: string | null;
    created_at: string; banned?: boolean;
  }[] = [];

  const { data: u1, error: e1 } = await supabaseAdmin
    .from('users')
    .select('id, phone_number, name, created_at, banned')
    .order('created_at', { ascending: false });

  if (e1) {
    // banned column may not exist yet
    const { data: u2, error: e2 } = await supabaseAdmin
      .from('users')
      .select('id, phone_number, name, created_at')
      .order('created_at', { ascending: false });
    if (e2) return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    usersData = (u2 || []).map((u) => ({ ...u, banned: false }));
  } else {
    usersData = (u1 || []).map((u) => ({ ...u, banned: u.banned ?? false }));
  }

  if (usersData.length === 0) return NextResponse.json({ users: [] });

  // ── Step 2: Fetch memberships separately (try with new cols, fall back) ──
  type MembershipRow = {
    user_id: string; id: string; start_date: string; end_date: string;
    active: boolean; joined_on?: string | null; last_renewed_on?: string | null;
  };

  let membershipsData: MembershipRow[] = [];

  const { data: m1, error: me1 } = await supabaseAdmin
    .from('memberships')
    .select('user_id, id, start_date, end_date, active, joined_on, last_renewed_on');

  if (me1) {
    // joined_on / last_renewed_on may not exist yet
    const { data: m2, error: me2 } = await supabaseAdmin
      .from('memberships')
      .select('user_id, id, start_date, end_date, active');
    if (!me2) {
      membershipsData = (m2 || []).map((m) => ({
        ...m,
        joined_on: m.start_date,
        last_renewed_on: null,
      }));
    }
    // If m2 also fails, membershipsData stays [] — users show with no plan
  } else {
    membershipsData = (m1 || []).map((m) => ({
      ...m,
      joined_on: m.joined_on ?? m.start_date,
      last_renewed_on: m.last_renewed_on ?? null,
    }));
  }

  // ── Step 3: Join in code ──
  const membershipByUser = new Map<string, MembershipRow>();
  for (const m of membershipsData) {
    membershipByUser.set(m.user_id, m);
  }

  const users = usersData.map((u) => {
    const mem = membershipByUser.get(u.id);
    return {
      ...u,
      memberships: mem ? [mem] : [],
    };
  });

  return NextResponse.json({ users });
}

// PATCH /api/admin/users — ban or unban a user
export async function PATCH(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { user_id, banned } = await req.json();
  if (!user_id || typeof banned !== 'boolean') {
    return NextResponse.json({ error: 'Missing user_id or banned field' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ banned })
    .eq('id', user_id);

  if (error) return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/users?user_id=xxx — permanently delete a member
export async function DELETE(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const user_id = new URL(req.url).searchParams.get('user_id');
  if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', user_id);

  if (error) return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });

  return NextResponse.json({ success: true });
}
