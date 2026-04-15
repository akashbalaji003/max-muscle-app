import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

const REQUIRED_TABLES = ['post_likes', 'post_comments', 'user_follows', 'activity_feed'];

/**
 * GET /api/social/health
 *
 * Checks which social tables exist. Returns:
 *   { ready: boolean, missing: string[] }
 *
 * The client uses this to show a one-time migration banner.
 */
export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', REQUIRED_TABLES);

  if (error) {
    // information_schema query failed — treat as ready so we don't block the UI
    return NextResponse.json({ ready: true, missing: [] });
  }

  const existing = new Set((data ?? []).map((r: { table_name: string }) => r.table_name));
  const missing  = REQUIRED_TABLES.filter((t) => !existing.has(t));

  return NextResponse.json({ ready: missing.length === 0, missing });
}
