/**
 * GymOS Per-Gym Service Worker
 *
 * Registered with scope /{gymSlug}/ so each gym is completely isolated.
 * The gymSlug is derived from self.registration.scope at runtime —
 * no hardcoding required.
 */

// Derive gymSlug from the registered scope, e.g. "https://host/maxmuscle/" → "maxmuscle"
const scopeUrl  = new URL(self.registration.scope);
const gymSlug   = scopeUrl.pathname.split('/').filter(Boolean)[0] || 'gymapp';
const CACHE_NAME = `${gymSlug}-v1`;

const STATIC_ASSETS = [
  '/icon-192x192.png',
  '/icon-512x512.png',
  `/api/manifest?gymSlug=${gymSlug}`,
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate — purge old caches for THIS gym only ────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith(gymSlug + '-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch — network-first, cache as fallback ─────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and API requests (auth, data mutations must always hit network)
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  // Only handle requests within this gym's scope
  if (!url.pathname.startsWith(`/${gymSlug}/`) &&
      !url.pathname.startsWith('/_next/') &&
      url.origin === self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Cache successful responses for static assets
        if (res.ok && (url.pathname.startsWith('/_next/static/') || STATIC_ASSETS.includes(url.pathname))) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
