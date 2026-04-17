import { NextRequest, NextResponse } from 'next/server';
import { signToken, setAuthCookie, verifyPassword } from '@/lib/auth';

/**
 * Super admin login.
 * Uses SUPER_ADMIN_PASSWORD_HASH (bcrypt) if set, falls back to SUPER_ADMIN_PASSWORD.
 * To generate a hash: node -e "require('bcryptjs').hash('YourPass',12).then(console.log)"
 */
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const superAdminUser     = process.env.SUPER_ADMIN_USERNAME;
    const superAdminPassHash = process.env.SUPER_ADMIN_PASSWORD_HASH; // bcrypt (preferred)
    const superAdminPassRaw  = process.env.SUPER_ADMIN_PASSWORD;      // plaintext fallback

    if (!superAdminUser) {
      return NextResponse.json({ error: 'Super admin not configured' }, { status: 500 });
    }

    if (username !== superAdminUser) {
      return NextResponse.json({ error: 'Invalid super admin credentials' }, { status: 401 });
    }

    let passwordValid = false;
    if (superAdminPassHash) {
      passwordValid = await verifyPassword(password, superAdminPassHash);
    } else if (superAdminPassRaw) {
      passwordValid = password === superAdminPassRaw;
    }

    if (!passwordValid) {
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
