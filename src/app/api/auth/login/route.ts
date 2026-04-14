import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyPassword, signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { phone_number, password } = await req.json();

    if (!phone_number || !password) {
      return NextResponse.json({ error: 'Phone number and password are required' }, { status: 400 });
    }

    const normalizedPhone = phone_number.replace(/\s/g, '');

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, phone_number, name, password_hash, banned')
      .eq('phone_number', normalizedPhone)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.banned) {
      return NextResponse.json({ error: 'Your account has been suspended. Please contact the gym.' }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({ userId: user.id, phone: user.phone_number, role: 'user' });
    const cookie = setAuthCookie(token);

    const response = NextResponse.json({
      message: 'Login successful',
      user: { id: user.id, phone_number: user.phone_number, name: user.name },
    });
    response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2]);
    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
