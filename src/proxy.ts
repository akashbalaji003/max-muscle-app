import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Exact public paths (no auth required)
const PUBLIC_EXACT = new Set(['/', '/login', '/signup', '/admin/login', '/checkin']);

// Public API prefixes
const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/admin/login',
  '/api/qr',
  '/api/exercises',
];

// Admin-only prefixes (require admin JWT)
const ADMIN_PREFIXES = ['/admin/dashboard', '/admin/qr', '/api/admin/'];

// User-protected prefixes
const USER_PREFIXES = [
  '/dashboard', '/workout', '/analytics', '/leaderboard', '/progress',
  '/api/attendance', '/api/workout', '/api/analytics', '/api/leaderboard',
  '/api/progress', '/api/upload', '/api/auth/me',
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow static assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/manifest')) {
    return NextResponse.next();
  }

  // Allow exact public pages
  if (PUBLIC_EXACT.has(pathname)) return NextResponse.next();

  // Allow public API routes
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get('gym_token')?.value;
  const isApi = pathname.startsWith('/api/');

  // ── Admin routes ────────────────────────────────────────
  if (ADMIN_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!token) {
      return isApi
        ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        : NextResponse.redirect(new URL('/admin/login', req.url));
    }
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return isApi
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/admin/login', req.url));
    }
    return NextResponse.next();
  }

  // ── User protected routes ───────────────────────────────
  if (USER_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!token) {
      return isApi
        ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        : NextResponse.redirect(new URL('/login', req.url));
    }
    const payload = verifyToken(token);
    if (!payload) {
      return isApi
        ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        : NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
