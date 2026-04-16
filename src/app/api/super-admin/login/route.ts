import { NextRequest, NextResponse } from 'next/server';
import { signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const superAdminUser = process.env.SUPER_ADMIN_USERNAME;
    const superAdminPass = process.env.SUPER_ADMIN_PASSWORD;

    if (!superAdminUser || !superAdminPass) {
      return NextResponse.json({ error: 'Super admin not configured' }, { status: 500 });
    }

    if (username !== superAdminUser || password !== superAdminPass) {
      return NextResponse.json({ error: 'Invalid super admin credentials' }, { status: 401 });
    }

    const token = signToken({ userId: 'super_admin', phone: 'super_admin', role: 'super_admin' });
    const cookie = setAuthCookie(token);

    const response = NextResponse.json({ message: 'Super admin login successful' });
    response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2]);
    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
