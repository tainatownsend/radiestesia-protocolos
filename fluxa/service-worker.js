const CACHE_NAME = 'fluxa-runtime-v1';
const ROOT = new URL('./', self.location.href).href;

function localAssetUrls(html) {
  const urls = new Set([ROOT]);
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const ref = match[1];
    if (!ref || /^(https?:|data:|#)/.test(ref)) continue;
    const url = new URL(ref, ROOT);
    if (url.origin === self.location.origin && url.pathname.includes('/fluxa/')) urls.add(url.href);
  }
  return [...urls];
}

async function cacheResponse(request, response) {
  if (!response || !response.ok || request.method !== 'GET') return response;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.includes('/fluxa/')) return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

async function precacheCurrentShell() {
  const cache = await caches.open(CACHE_NAME);
  const response = await fetch(ROOT, { cache: 'reload' });
  if (!response.ok) return;
  await cache.put(ROOT, response.clone());
  const html = await response.text();
  const assets = localAssetUrls(html).filter((url) => url !== ROOT);
  await Promise.all(assets.map(async (url) => {
    try {
      const asset = await fetch(url, { cache: 'reload' });
      if (asset.ok) await cache.put(url, asset.clone());
    } catch (_) {}
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try { await precacheCurrentShell(); } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('fluxa-runtime-') && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.includes('/fluxa/')) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      return await cacheResponse(request, response);
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const root = await caches.match(ROOT);
        if (root) return root;
      }
      throw error;
    }
  })());
});
