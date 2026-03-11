const CACHE_NAME = "asistencia-pwa-v2";
const APP_SHELL = [
  "/",
  "./",
  "./asistencia.html",
  "./manifest.json",
  "./sw.js",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg"
];
const THIRD_PARTY_ASSETS = [
  "https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js"
];

async function precacheThirdPartyAsset(cache, url) {
  try {
    const req = new Request(url, { mode: "no-cors", cache: "reload" });
    const res = await fetch(req);
    if (res) await cache.put(url, res.clone());
  } catch (_err) {
    // Ignore transient CDN/network errors so SW installation never fails.
  }
}

async function staleWhileRevalidate(request, cacheKey = request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(cacheKey);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response) cache.put(cacheKey, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || (await networkPromise) || Response.error();
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    await cache.put("./asistencia.html", response.clone());
    return response;
  } catch (_err) {
    return (await caches.match(request)) || (await caches.match("./asistencia.html")) || Response.error();
  }
}

async function cacheFirstSameOrigin(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && (response.status === 200 || response.type === "opaque")) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_err) {
    return (await caches.match("./asistencia.html")) || Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
      await Promise.allSettled(THIRD_PARTY_ASSETS.map((url) => precacheThirdPartyAsset(cache, url)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstSameOrigin(event.request));
    return;
  }

  if (THIRD_PARTY_ASSETS.includes(url.href)) {
    event.respondWith(staleWhileRevalidate(event.request, url.href));
  }
});
