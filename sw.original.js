const CACHE_VERSION = 'v8';
const STATIC_CACHE = `mcprime-static-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/nfc/offline.html',
  '/nfc/style.css',
  '/nfc/homepage.css',
  '/nfc/mobile.css',
  '/nfc/cookie-consent.css',
  '/nfc/manifest.json',
  '/nfc/logo.svg',
  '/nfc/mc-prime-nfc.png',
  '/nfc/mcprime-logo-optimized.webp',
];

const OFFLINE_PAGE = '/nfc/offline.html';

const SENSITIVE_PATHS = [
  '/nfc/dashboard',
  '/nfc/dashboard.html',
  '/nfc/dashboard-en',
  '/nfc/dashboard-en.html',
  '/nfc/login',
  '/nfc/login.html',
  '/nfc/login-en',
  '/nfc/login-en.html',
  '/nfc/signup',
  '/nfc/signup.html',
  '/nfc/signup-en',
  '/nfc/signup-en.html',
  '/nfc/forgot-password',
  '/nfc/forgot-password.html',
  '/nfc/reset-password',
  '/nfc/reset-password.html',
  '/nfc/verify-email',
  '/nfc/verify-email.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to pre-cache:', err);
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('mcprime-') && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.protocol === 'chrome-extension:') return;
  if (url.pathname.startsWith('/api/')) return;

  // Never serve executable code or runtime configuration from a stale SW cache.
  // Security fixes to these files must take effect on the next navigation/request.
  if (isExecutableOrConfigAsset(url.pathname)) {
    event.respondWith(fetch(request));
    return;
  }

  if (isSensitiveRequest(request, url)) {
    event.respondWith(fetch(request));
    return;
  }

  if (isHtmlRequest(request, url)) {
    event.respondWith(networkOnlyHtmlWithOfflineFallback(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkOnlyHtmlWithOfflineFallback(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const offlineCached = await caches.match(OFFLINE_PAGE);
    return offlineCached || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async (networkResponse) => {
      if (canCacheResponse(request, networkResponse)) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  if (cached) return cached;

  const networkResponse = await networkPromise;
  return networkResponse || new Response('', { status: 408, statusText: 'Offline' });
}

function isHtmlRequest(request, url) {
  return request.headers.get('accept')?.includes('text/html') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/');
}

function isExecutableOrConfigAsset(pathname) {
  return /\.(?:js|mjs|json|wasm)$/i.test(pathname);
}

function isStaticAsset(pathname) {
  return /\.(css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot)$/i.test(pathname);
}

function isSensitiveRequest(request, url) {
  if (request.headers.has('authorization')) return true;
  if (request.headers.has('cookie')) return true;
  return SENSITIVE_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`));
}

function canCacheResponse(request, response) {
  if (!response || !response.ok) return false;
  if (request.headers.has('authorization') || request.headers.has('cookie')) return false;

  const cacheControl = response.headers.get('cache-control') || '';
  if (/\b(no-store|no-cache|private)\b/i.test(cacheControl)) return false;
  if (response.headers.has('set-cookie')) return false;

  return true;
}
