/* OmborSavdo — service worker.
 * Ilova qobig'i keshlanadi (tez ochiladi). Ma'lumotlar (GET /api) avval internetdan, bo'lmasa oxirgi nusxadan.
 * Kirish so'rovlari va o'zgartirishlar hech qachon keshlanmaydi. Chiqishda kesh tozalanadi.
 */
const SHELL = 'ombor-shell-v1';
const API = 'ombor-api-v1';
const KEEP = [SHELL, API];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png', '/favicon.svg'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', (e) => {
  if (e.data === 'clear-user-data') e.waitUntil(caches.delete(API));
});

async function networkFirst(req, name) {
  const cache = await caches.open(name);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) {
    if (/^\/api\/(auth|docs|openapi|redoc|health)/.test(url.pathname) || url.pathname.endsWith('/export')) return;
    e.respondWith(networkFirst(req, API));
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(SHELL).then((c) => c.put('/', copy));
      return res;
    }).catch(async () => (await caches.match('/')) || Response.error()));
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) e.respondWith(cacheFirst(req, SHELL));
});
