import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const COOKIE_NAME = 'gym_token';

/**
 * Server-side route protection (Next.js 16 proxy — replaces middleware.ts).
 * Guards admin, super-admin, and member dashboard routes.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Super Admin routes ───────────────────────────────────────────────────
  if (pathname.startsWith('/super-admin') && pathname !== '/super-admin-login') {
    const token   = req.cookies.get(COOKIE_NAME)?.value;
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/super-admin-login', req.url));
    }
    return NextResponse.next();
  }

  // ── Gym Admin routes (pages only — APIs guard themselves) ────────────────
  if (
    pathname.startsWith('/admin') &&
    pathname !== '/admin/login' &&
    !pathname.startsWith('/api/')
  ) {
    const token   = req.cookies.get(COOKIE_NAME)?.value;
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    return NextResponse.next();
  }

  // ── Member dashboard + app routes ────────────────────────────────────────
  const memberPaths = [
    '/dashboard', '/checkin', '/analytics', '/workout',
    '/progress', '/leaderboard', '/profile', '/social',
  ];
  if (memberPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const token   = req.cookies.get(COOKIE_NAME)?.value;
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== 'user') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/super-admin/:path*',
    '/dashboard/:path*',
    '/checkin/:path*',
    '/analytics/:path*',
    '/workout/:path*',
    '/progress/:path*',
    '/leaderboard/:path*',
    '/profile/:path*',
    '/social/:path*',
  ],
};
