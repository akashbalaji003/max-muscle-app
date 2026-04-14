import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword, signToken, setAuthCookie } from '@/lib/auth';
import { isValidPhone } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { phone_number, password, name } = await req.json();

    // Validation
    if (!phone_number || !password) {
      return NextResponse.json({ error: 'Phone number and password are required' }, { status: 400 });
    }
    if (!isValidPhone(phone_number)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const normalizedPhone = phone_number.replace(/\s/g, '');

    // Check duplicate
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 });
    }

    const password_hash = await hashPassword(password);

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({ phone_number: normalizedPhone, password_hash, name: name || null })
      .select('id, phone_number, name')
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    const token = signToken({ userId: user.id, phone: user.phone_number, role: 'user' });
    const cookie = setAuthCookie(token);

    const response = NextResponse.json(
      { message: 'Account created', user: { id: user.id, phone_number: user.phone_number, name: user.name } },
      { status: 201 }
    );
    response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2]);
    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
