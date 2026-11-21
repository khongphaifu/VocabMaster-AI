// sw.js - Service Worker hỗ trợ Offline & Tự Động Cập Nhật trên iPad
const CACHE_NAME = 'vocabmaster-ipad-v1.1.2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './pdf-ipad.js',
  './storage-adapter.js',
  './manifest.webmanifest',
  '../icons/icon-48.png',
  '../icons/icon-128.png',
  '../icons/icon-180.png',
  '../icons/icon-192.png',
  '../icons/icon-512.png',
  '../utils/ai-client.js',
  '../utils/cambridge-client.js',
  '../utils/dict-resolver.js',
  '../utils/modern-lexicon.js',
  '../utils/cloud-sync.js',
  '../utils/docx-reader.js',
  '../lib/pdf.min.js',
  '../lib/pdf.worker.min.js',
  '../lib/pdf_viewer.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => cache.add(url).catch(() => null))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // External APIs (GitHub Sync, AI providers, Dictionary APIs): Network directly
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'Offline mode' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Heavy vendor libraries & icons: Cache-First
  if (url.pathname.includes('/lib/') || url.pathname.includes('/icons/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          }
          return resp;
        });
      })
    );
    return;
  }

  // App shell & JS modules: Network-First so updates land immediately on iPad, with offline cache fallback
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((resp) => {
        if (resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
        }
        return resp;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
