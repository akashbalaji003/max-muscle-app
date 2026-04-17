import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/consent
 * Records a consent decision for the current user.
 *
 * Body:
 *   terms_version_id    — UUID of the active terms version
 *   consent_terms       — boolean, must be true to accept
 *   consent_ai_training — boolean, optional AI data consent
 *   status              — 'accepted' | 'declined'
 */
export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || !['user', 'admin'].includes(payload.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { terms_version_id, consent_terms, consent_ai_training, status } = body;

  if (!terms_version_id || !['accepted', 'declined'].includes(status)) {
    return NextResponse.json({ error: 'terms_version_id and status (accepted|declined) are required' }, { status: 400 });
  }

  // Validate the terms version exists and is active
  const { data: version } = await supabaseAdmin
    .from('terms_versions')
    .select('id, is_active')
    .eq('id', terms_version_id)
    .eq('is_active', true)
    .maybeSingle();

  if (!version) {
    return NextResponse.json({ error: 'Invalid or inactive terms version' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const role = payload.role === 'user' ? 'member' : 'admin';

  const consentRecord = {
    user_id: payload.userId,
    role,
    terms_version_id,
    consent_terms:       status === 'accepted' ? Boolean(consent_terms) : false,
    consent_ai_training: status === 'accepted' ? Boolean(consent_ai_training) : false,
    status,
    accepted_at:  status === 'accepted' ? now : null,
    declined_at:  status === 'declined' ? now : null,
    withdrawn_at: null,
  };

  const { error: insertErr } = await supabaseAdmin
    .from('user_consents')
    .insert(consentRecord);

  if (insertErr) {
    console.error('Consent insert error:', insertErr);
    return NextResponse.json({ error: 'Failed to save consent' }, { status: 500 });
  }

  // If accepted + AI training consent, upsert the AI member profile
  // (pseudonymous — no phone number, no social data)
  if (status === 'accepted' && consent_ai_training && payload.role === 'user') {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, height_cm, weight_kg, goal, gym_id, created_at')
      .eq('id', payload.userId)
      .maybeSingle();

    if (user) {
      const gymId = user.gym_id ?? null;

      // Derive age_band from account age (proxy for experience level)
      const accountAgeMonths = Math.floor(
        (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      const experienceLevel =
        accountAgeMonths < 3 ? 'beginner' :
        accountAgeMonths < 12 ? 'intermediate' : 'advanced';

      await supabaseAdmin
        .from('ai_member_profiles')
        .upsert({
          member_id:          user.id,
          gym_id:             gymId,
          height_cm:          user.height_cm ?? null,
          baseline_weight_kg: user.weight_kg ?? null,
          goal:               user.goal ?? null,
          experience_level:   experienceLevel,
          consent_enabled:    true,
          updated_at:         now,
        }, { onConflict: 'member_id' });
    }
  }

  // If AI training withdrawn/declined, mark profile consent_enabled = false
  if ((status === 'declined' || !consent_ai_training) && payload.role === 'user') {
    await supabaseAdmin
      .from('ai_member_profiles')
      .update({ consent_enabled: false, updated_at: now })
      .eq('member_id', payload.userId);
  }

  return NextResponse.json({ ok: true, status });
}

/**
 * PATCH /api/consent  — withdraw AI training consent
 * Body: { action: 'withdraw_ai' }
 */
export async function PATCH(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== 'user') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action } = await req.json();
  if (action !== 'withdraw_ai') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Get the user's most recent accepted consent
  const { data: latest } = await supabaseAdmin
    .from('user_consents')
    .select('id')
    .eq('user_id', payload.userId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) {
    return NextResponse.json({ error: 'No active consent found' }, { status: 404 });
  }

  // Insert a withdrawn record (keeps full audit trail)
  await supabaseAdmin.from('user_consents').insert({
    user_id:             payload.userId,
    role:                'member',
    terms_version_id:    null,
    consent_terms:       false,
    consent_ai_training: false,
    status:              'withdrawn',
    withdrawn_at:        now,
  });

  // Disable AI data collection for this user
  await supabaseAdmin
    .from('ai_member_profiles')
    .update({ consent_enabled: false, updated_at: now })
    .eq('member_id', payload.userId);

  return NextResponse.json({ ok: true });
}
