/* CYRUS v3.0 — Service Worker
   Strategy:
   - App shell (HTML, CSS, JS): Cache-first with network fallback + background refresh
   - API calls (/api/*): Network-only (never cache — live data)
   - Static assets (images, fonts): Stale-while-revalidate
*/

const CACHE_NAME = "cyrus-v3-shell";
const API_RE     = /^\/api\//;

/* Assets to pre-cache on install */
const PRECACHE = ["/", "/favicon.svg", "/favicon.png", "/pwa-icon.svg"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  /* Skip non-GET, cross-origin, API, and WebSocket requests */
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    API_RE.test(url.pathname) ||
    url.pathname.startsWith("/socket.io") ||
    url.pathname.startsWith("/ws") ||
    url.pathname.startsWith("/cyrus-io")
  ) {
    return;
  }

  /* Navigation requests: network-first, fall back to cached index.html */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match("/") || caches.match(request))
    );
    return;
  }

  /* Static assets: stale-while-revalidate */
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        });
        return cached || networkFetch;
      })
    )
  );
});
