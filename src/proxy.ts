import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const COOKIE_NAME = 'gym_token';

// Routes that require a gym member session under /[gymSlug]/*
const GYM_PROTECTED_SEGMENTS = [
  'dashboard', 'workout', 'analytics', 'leaderboard',
  'progress', 'checkin', 'profile', 'social',
];

/**
 * Next.js 16 proxy — replaces middleware.ts.
 * Guards: super-admin, gym admin, legacy member routes, and [gymSlug]/* member routes.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── 1. Super Admin routes ────────────────────────────────────────────────
  if (pathname.startsWith('/super-admin')) {
    const token   = req.cookies.get(COOKIE_NAME)?.value;
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // ── 2. Gym Admin routes (static /admin/*) ────────────────────────────────
  if (
    pathname.startsWith('/admin') &&
    pathname !== '/admin/login' &&
    !pathname.startsWith('/api/')
  ) {
    const token   = req.cookies.get(COOKIE_NAME)?.value;
    const payload = token ? verifyToken(token) : null;
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    return NextResponse.next();
  }

  // ── 3. [gymSlug]/(protected)/* routes — e.g. /maxmuscle/dashboard ────────
  const segments = pathname.split('/').filter(Boolean);
  // Pattern: /[gymSlug]/[protectedSegment][/...]
  if (
    segments.length >= 2 &&
    GYM_PROTECTED_SEGMENTS.includes(segments[1]) &&
    !pathname.startsWith('/api/')
  ) {
    const gymSlug = segments[0];
    const token   = req.cookies.get(COOKIE_NAME)?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.redirect(new URL(`/${gymSlug}/login`, req.url));
    }
    // Super admin can access any gym route
    if (payload.role === 'super_admin') return NextResponse.next();
    // Admin: let through (protected layout handles redirect to admin dashboard)
    if (payload.role === 'admin') return NextResponse.next();
    // Regular member: must be a user
    if (payload.role !== 'user') {
      return NextResponse.redirect(new URL(`/${gymSlug}/login`, req.url));
    }
    return NextResponse.next();
  }

  // ── 4. Legacy member routes (no gymSlug prefix) ──────────────────────────
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
    // Static protected routes
    '/admin/:path*',
    '/super-admin/:path*',
    // Legacy member routes
    '/dashboard/:path*',
    '/checkin/:path*',
    '/analytics/:path*',
    '/workout/:path*',
    '/progress/:path*',
    '/leaderboard/:path*',
    '/profile/:path*',
    '/social/:path*',
    // [gymSlug] protected routes — catch /[slug]/dashboard, /[slug]/workout, etc.
    // We guard these in the proxy logic above using the segments check.
    '/:gymSlug/dashboard/:path*',
    '/:gymSlug/workout/:path*',
    '/:gymSlug/analytics/:path*',
    '/:gymSlug/leaderboard/:path*',
    '/:gymSlug/progress/:path*',
    '/:gymSlug/checkin/:path*',
    '/:gymSlug/profile/:path*',
    '/:gymSlug/social/:path*',
  ],
};
