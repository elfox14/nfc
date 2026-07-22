/**
 * MC PRIME NFC — Service Worker
 * Strategy: Network-First for HTML/API, Cache-First for static assets
 *
 * Features:
 * - Offline page fallback
 * - Smart asset caching (CSS, JS, images)
 * - Background sync ready
 * - Auto-update with skipWaiting
 */

const CACHE_NAME = 'mcprime-v4';
const STATIC_CACHE = 'mcprime-static-v4';
const API_CACHE = 'mcprime-api-v4';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/nfc/',
  '/nfc/index.html',
  '/nfc/editor.html',
  '/nfc/style.css',
  '/nfc/homepage.css',
  '/nfc/mobile.css',
  '/nfc/cookie-consent.css',
  '/nfc/cookie-consent.js',
  '/nfc/error-reporter.js',
  '/nfc/manifest.json',
  '/nfc/logo.svg',
  '/nfc/mcprime-logo-optimized.webp',
];

// Offline fallback page (minimal)
const OFFLINE_PAGE = '/nfc/offline.html';

// ─── Install ───────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to pre-cache:', err);
      });
    })
  );
  // Activate immediately without waiting for other tabs
  self.skipWaiting();
});

// ─── Activate ──────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ─── Fetch Strategy ────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension URLs
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // API requests: Network-only (don't cache dynamic data)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // HTML pages: Network-First with offline fallback
  if (request.headers.get('accept')?.includes('text/html') || 
      url.pathname.endsWith('.html') || 
      url.pathname.endsWith('/')) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Static assets (CSS, JS, images, fonts): Stale-While-Revalidate
  // Returns cached version immediately but updates cache in background
  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

// ─── Strategies ────────────────────────────────

async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request);
    // Cache successful HTML responses
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Try cache
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // Last resort: offline page
    const offlineCached = await caches.match(OFFLINE_PAGE);
    if (offlineCached) return offlineCached;
    
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  // Always fetch from network in background to update cache
  const networkPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  // Return cached version immediately if available, otherwise wait for network
  if (cached) {
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;
  return new Response('', { status: 408, statusText: 'Offline' });
}

function isStaticAsset(pathname) {
  return /\.(css|js|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot)$/i.test(pathname);
}
