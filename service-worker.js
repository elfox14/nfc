// service-worker.js

const CACHE_NAME = 'mcprime-nfc-v2';
const ASSETS_TO_CACHE = [
  '/nfc/',
  '/nfc/index.html',
  '/nfc/editor.html',
  '/nfc/viewer.html',
  '/nfc/style.css',
  '/nfc/viewer.css',
  '/nfc/script-core.js',
  '/nfc/script-ui.js',
  '/nfc/script-card.js',
  '/nfc/script-main.js',
  '/nfc/viewer.js',
  '/nfc/mcprime-logo-transparent.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@700&family=Poppins:wght@400;700&family=Tajawal:wght@400;700&family=Lalezar&display=swap'
];

// Install Event: Cache core assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker ...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate Event: Cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker ...');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Fetch Event: Stale-While-Revalidate Strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API requests (always network first)
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Update cache with new version if successful
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      }).catch(() => {
          // Network failed, return offline fallback if needed
          // For now, just rely on cache or failure
      });

      // Return cached response immediately if available, else wait for network
      return cachedResponse || fetchPromise;
    })
  );
});