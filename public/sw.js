const CACHE_NAME = 'prompter-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // 同步 API（含 SSE 长连接）不经过缓存
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }
  // 网络优先，失败时回退缓存，保证离线时界面仍可打开
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && url.origin === location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || Promise.reject(new Error('offline'))))
  );
});
