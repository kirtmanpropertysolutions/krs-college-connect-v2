/**
 * KRS service worker — offline support + smarter caching.
 *
 * Three caching strategies, picked per-request:
 *
 *   1. **Network only** for /api/* and Supabase REST/auth/realtime —
 *      live data must never be served stale, and writes (POST/PUT/
 *      DELETE) must never be intercepted. Bypass the SW entirely.
 *
 *   2. **Network first, cache fallback** for navigation requests
 *      (the HTML shell). Fresh deploys still win, but if the user
 *      is offline on the bus the cached index.html opens immediately
 *      with the app shell — they see the dashboard skeleton even
 *      without signal.
 *
 *   3. **Cache first** for hashed JS/CSS/image assets in /assets/*.
 *      Vite bakes a content hash into every asset filename, so once
 *      cached they're effectively immutable — serving from cache is
 *      always correct AND saves a network round-trip on every page
 *      load. New deploys produce new hashes which get fetched fresh
 *      then cached.
 *
 * Cache versioning via the CACHE_VERSION constant. Bumping it on a
 * future deploy invalidates the previous cache on the user's device
 * during the SW's `activate` event. (Service workers update on their
 * own when the file at this URL changes — Vite ensures that
 * automatically because every build produces a different bundle.)
 */

const CACHE_VERSION = 'krs-v1'
const SHELL_CACHE = `${CACHE_VERSION}-shell`
const ASSET_CACHE = `${CACHE_VERSION}-assets`

// Minimum shell precache so the app opens offline even on first
// visit-after-install. Hashed bundle paths can't be hardcoded here
// (the build outputs different names every time), so we precache
// only the root document; runtime fetch handlers cache assets as
// they're requested.
const PRECACHE_URLS = ['/', '/manifest.json', '/eastside-fc-logo.png', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // Take over immediately on first install rather than waiting
      // for all tabs of the site to close. Combined with clients.claim
      // below this gives the user offline support on the same session
      // they install the SW.
      .then(() => self.skipWaiting())
  )
})

// The page can send a SKIP_WAITING message to force a stuck SW to
// activate. Used by main.jsx's auto-update flow so newly-deployed
// code starts running without requiring the user to force-quit the
// app. Without this, the new SW would sit in "waiting" until every
// tab of the site closed.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop any cache that isn't part of the current version. Cleans
      // up old chunks after a deploy bumps CACHE_VERSION.
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => !name.startsWith(CACHE_VERSION))
          .map((name) => caches.delete(name))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // ── Strategy 1: never intercept dynamic/data requests ───────────
  // Live data, auth tokens, edge functions, and any cross-origin
  // request (Supabase, fonts, Mux) go straight to network. The SW
  // gets out of the way.
  const isAPI =
    url.pathname.startsWith('/api/') ||
    url.hostname.endsWith('.supabase.co') ||
    url.hostname.endsWith('.supabase.in') ||
    url.hostname !== self.location.hostname

  // Also bail out for any non-GET — POST/PUT/DELETE always go to
  // network, the cache should never serve writes.
  if (isAPI || request.method !== 'GET') return

  // ── Strategy 2: HTML navigations → network first, cache fallback
  // Athletes opening the app online get the latest deploy. Athletes
  // opening it offline get the previously-cached app shell, which
  // boots and renders the dashboard skeleton even without signal.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Update cached shell with the fresh HTML for next offline boot
          const copy = response.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    )
    return
  }

  // ── Strategy 3: hashed assets → cache first, network on miss
  // /assets/index-abc123.css and friends are content-hashed, so a
  // cache hit is always correct.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          // Only cache successful responses
          if (!response || response.status !== 200) return response
          const copy = response.clone()
          caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
      })
    )
    return
  }

  // Anything else: try network, fall back to cache if available.
  // Quiet default; no-op for the user if it's something they don't need.
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})
