import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/consent/check
 * Returns whether the current user needs to accept the latest active terms.
 * Works for both member (role='user') and admin (role='admin') tokens.
 */
export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || !['user', 'admin'].includes(payload.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the current active terms version
  const { data: activeVersion, error: vErr } = await supabaseAdmin
    .from('terms_versions')
    .select('id, version, title, effective_date')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (vErr || !activeVersion) {
    // No active terms version — skip consent (graceful degradation)
    return NextResponse.json({ needs_consent: false });
  }

  // Check if this user already accepted this version
  const { data: existing } = await supabaseAdmin
    .from('user_consents')
    .select('id, status, consent_ai_training')
    .eq('user_id', payload.userId)
    .eq('terms_version_id', activeVersion.id)
    .in('status', ['accepted', 'declined'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      needs_consent: false,
      status: existing.status,
      consent_ai_training: existing.consent_ai_training,
    });
  }

  return NextResponse.json({
    needs_consent: true,
    terms_version: {
      id: activeVersion.id,
      version: activeVersion.version,
      title: activeVersion.title,
      effective_date: activeVersion.effective_date,
    },
  });
}
