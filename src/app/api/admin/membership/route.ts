import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { addMonths, format, parseISO, isAfter } from 'date-fns';

function requireAdmin(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

const today = () => new Date();
const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

// POST /api/admin/membership
// Body: { phone_number, duration_months, action: 'add' | 'renew' }
export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { phone_number, duration_months, action } = await req.json();

    if (!phone_number || !duration_months || duration_months < 1) {
      return NextResponse.json(
        { error: 'phone_number and duration_months (≥1) are required' },
        { status: 400 }
      );
    }

    if (action !== 'add' && action !== 'renew') {
      return NextResponse.json(
        { error: 'action must be "add" or "renew"' },
        { status: 400 }
      );
    }

    // Find user by phone
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name, phone_number')
      .eq('phone_number', phone_number.replace(/\s/g, ''))
      .single();

    if (!user) {
      return NextResponse.json({ error: 'No user found with that phone number' }, { status: 404 });
    }

    // Fetch existing membership (try with new cols, fall back gracefully)
    let existing: { id: string; start_date: string; end_date: string; joined_on?: string | null; last_renewed_on?: string | null } | null = null;
    const { data: ex1, error: exErr } = await supabaseAdmin
      .from('memberships')
      .select('id, start_date, end_date, joined_on, last_renewed_on')
      .eq('user_id', user.id)
      .maybeSingle();
    if (exErr) {
      const { data: ex2 } = await supabaseAdmin
        .from('memberships')
        .select('id, start_date, end_date')
        .eq('user_id', user.id)
        .maybeSingle();
      existing = ex2 ? { ...ex2, joined_on: null, last_renewed_on: null } : null;
    } else {
      existing = ex1;
    }

    // ── ADD ────────────────────────────────────────────────────────────────
    if (action === 'add') {
      if (existing) {
        return NextResponse.json(
          { error: `${user.name || user.phone_number} already has a membership. Use "Renew Membership" to extend it.` },
          { status: 409 }
        );
      }

      const startDate = fmt(today());
      const endDate = fmt(addMonths(today(), duration_months));

      // Try insert with new columns; fall back without them if migration not run yet
      let { data: membership, error } = await supabaseAdmin
        .from('memberships')
        .insert({ user_id: user.id, start_date: startDate, end_date: endDate, joined_on: startDate, last_renewed_on: null, active: true })
        .select()
        .single();

      if (error) {
        // joined_on / last_renewed_on may not exist — retry without them
        ({ data: membership, error } = await supabaseAdmin
          .from('memberships')
          .insert({ user_id: user.id, start_date: startDate, end_date: endDate, active: true })
          .select()
          .single());
      }

      if (error) {
        return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 });
      }

      return NextResponse.json({
        message: `Membership added for ${user.name || user.phone_number}`,
        membership,
      });
    }

    // ── RENEW ───────────────────────────────────────────────────────────────
    if (action === 'renew') {
      if (!existing) {
        return NextResponse.json(
          { error: `${user.name || user.phone_number} has no existing membership. Use "Add Membership" first.` },
          { status: 404 }
        );
      }

      const now = today();
      const currentEnd = parseISO(existing.end_date);
      const isActive = isAfter(currentEnd, now);

      // If active: extend from current end date. If expired: start fresh from today.
      const renewFrom = isActive ? currentEnd : now;
      const newEndDate = fmt(addMonths(renewFrom, duration_months));
      const renewedOn = fmt(now);

      // Try update with last_renewed_on; fall back without it if migration not run yet
      let { data: membership, error } = await supabaseAdmin
        .from('memberships')
        .update({ end_date: newEndDate, last_renewed_on: renewedOn, active: true })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        // last_renewed_on may not exist — retry without it
        ({ data: membership, error } = await supabaseAdmin
          .from('memberships')
          .update({ end_date: newEndDate, active: true })
          .eq('user_id', user.id)
          .select()
          .single());
      }

      if (error) {
        return NextResponse.json({ error: 'Failed to renew membership' }, { status: 500 });
      }

      const wasExpired = !isActive;
      return NextResponse.json({
        message: wasExpired
          ? `Membership reactivated for ${user.name || user.phone_number} — expires ${newEndDate}`
          : `Membership extended for ${user.name || user.phone_number} — new expiry ${newEndDate}`,
        membership,
      });
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/admin/membership — list all memberships (with user info)
export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('memberships')
    .select('*, users (id, phone_number, name)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Failed to fetch memberships' }, { status: 500 });

  return NextResponse.json({ memberships: data });
}

// DELETE /api/admin/membership?user_id=xxx — cancel a user's membership
export async function DELETE(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const user_id = new URL(req.url).searchParams.get('user_id');
  if (!user_id) return NextResponse.json({ error: 'user_id is required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('memberships')
    .delete()
    .eq('user_id', user_id);

  if (error) return NextResponse.json({ error: 'Failed to cancel membership' }, { status: 500 });

  return NextResponse.json({ message: 'Membership cancelled' });
}
