import { NextRequest, NextResponse } from 'next/server';
import { signToken, setAuthCookie, verifyPassword } from '@/lib/auth';

/**
 * Admin login.
 * Password verification priority:
 *   1. ADMIN_PASSWORD_HASH (bcrypt hash) — recommended for production
 *   2. ADMIN_PASSWORD (plaintext fallback) — legacy / dev only
 *
 * To generate a hash: node -e "require('bcryptjs').hash('YourPass',12).then(console.log)"
 * Then set ADMIN_PASSWORD_HASH=<hash> in .env.local
 */
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const adminUser     = process.env.ADMIN_USERNAME;
    const adminPassHash = process.env.ADMIN_PASSWORD_HASH;   // bcrypt hash (preferred)
    const adminPassRaw  = process.env.ADMIN_PASSWORD;        // plaintext fallback

    if (username !== adminUser) {
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    }

    let passwordValid = false;
    if (adminPassHash) {
      passwordValid = await verifyPassword(password, adminPassHash);
    } else if (adminPassRaw) {
      passwordValid = password === adminPassRaw; // legacy plaintext — migrate to hash
    }

    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    }

    const token = signToken({ userId: 'admin', phone: 'admin', role: 'admin' });
    const cookie = setAuthCookie(token);

    const response = NextResponse.json({ message: 'Admin login successful' });
    response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2]);
    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
