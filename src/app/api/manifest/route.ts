import { NextRequest, NextResponse } from 'next/server';
import { getGymConfig } from '@/lib/gym-registry';

/**
 * GET /api/manifest?gymSlug=maxmuscle
 *
 * Returns a gym-specific Web App Manifest so each gym installs as its own PWA
 * with the correct start_url, scope, name, and theme.
 */
export async function GET(req: NextRequest) {
  const gymSlug = req.nextUrl.searchParams.get('gymSlug') ?? '';
  if (gymSlug === 'admin') {
    const manifest = {
      name: 'GymOS Admin',
      short_name: 'GymOS',
      description: 'Admin app for GymOS',
      start_url: '/admin/login',
      scope: '/admin/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#0B0B0F',
      theme_color: '#7C3AED',
      icons: [
        { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    };

    return new NextResponse(JSON.stringify(manifest), {
      status: 200,
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'no-store',
      },
    });
  }

  const config = getGymConfig(gymSlug);

  if (!config) {
    return new NextResponse('Unknown gym', { status: 404 });
  }

  const manifest = {
    name: config.name,
    short_name: config.short_name,
    description: `Member app for ${config.name}`,
    start_url: `/${gymSlug}/login`,
    scope: `/${gymSlug}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: config.background_color,
    theme_color: config.theme_color,
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };

  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json',
      // No caching so slug changes are always fresh
      'Cache-Control': 'no-store',
    },
  });
}
